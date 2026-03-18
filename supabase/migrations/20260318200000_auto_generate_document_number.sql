-- Auto-generate document number on INSERT
-- Issue: Documents fail to insert because 'number' column is NOT NULL but no value is provided
-- Solution: Create a trigger that auto-generates the document number based on doc_type and tenant_id
-- Date: 2026-03-18
-- Related: TEST-FLOW-REPORT.md

-- Function to generate document number
CREATE OR REPLACE FUNCTION generate_document_number(p_tenant_id UUID, p_doc_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_prefix TEXT;
    v_sequence INTEGER;
    v_padded TEXT;
BEGIN
    -- Determine prefix based on document type
    v_prefix := CASE p_doc_type
        WHEN 'QUOTATION' THEN 'QUO'
        WHEN 'SALES_ORDER' THEN 'SO'
        WHEN 'INVOICE' THEN 'INV'
        WHEN 'RECEIPT' THEN 'REC'
        WHEN 'VENDOR_BILL' THEN 'VB'
        WHEN 'PURCHASE_ORDER' THEN 'PO'
        WHEN 'CREDIT_NOTE' THEN 'CN'
        WHEN 'DEBIT_NOTE' THEN 'DN'
        ELSE 'DOC'
    END;

    -- Get next sequence number for this tenant and doc_type
    SELECT COALESCE(MAX(CAST(SUBSTRING(number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM documents
    WHERE tenant_id = p_tenant_id
      AND doc_type = p_doc_type
      AND number ~ ('^' || v_prefix || '-[0-9]+$');

    -- Pad with zeros (5 digits)
    v_padded := LPAD(v_sequence::TEXT, 5, '0');

    -- Return formatted number
    RETURN v_prefix || '-' || v_padded;
END;
$$;

-- Trigger function to auto-set document number
CREATE OR REPLACE FUNCTION set_document_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only generate if number is NULL
    IF NEW.number IS NULL THEN
        NEW.number := generate_document_number(NEW.tenant_id, NEW.doc_type);
    END IF;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_document_number ON documents;

-- Create trigger
CREATE TRIGGER trigger_set_document_number
    BEFORE INSERT ON documents
    FOR EACH ROW
    EXECUTE FUNCTION set_document_number();

-- Grant permissions
GRANT EXECUTE ON FUNCTION generate_document_number(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION set_document_number() TO authenticated, service_role;

-- Add comment
COMMENT ON FUNCTION generate_document_number(UUID, TEXT) IS
  'Generates sequential document numbers per tenant and doc_type. Format: PREFIX-00001';

COMMENT ON FUNCTION set_document_number() IS
  'Trigger function that auto-generates document number on INSERT if not provided';
