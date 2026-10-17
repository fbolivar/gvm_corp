-- Prefijo DMP para la numeración de las devoluciones a proveedor (PURCHASE_RETURN).
-- Reemplaza la función en sitio (el trigger set_document_number la sigue usando).
CREATE OR REPLACE FUNCTION generate_document_number(p_tenant_id UUID, p_doc_type document_type)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_prefix TEXT;
    v_sequence INTEGER;
    v_padded TEXT;
    v_doc_type_text TEXT;
BEGIN
    v_doc_type_text := p_doc_type::TEXT;
    v_prefix := CASE v_doc_type_text
        WHEN 'QUOTATION' THEN 'QUO'
        WHEN 'SALES_ORDER' THEN 'SO'
        WHEN 'INVOICE' THEN 'INV'
        WHEN 'RECEIPT' THEN 'REC'
        WHEN 'VENDOR_BILL' THEN 'VB'
        WHEN 'PURCHASE_ORDER' THEN 'PO'
        WHEN 'CREDIT_NOTE' THEN 'CN'
        WHEN 'DEBIT_NOTE' THEN 'DN'
        WHEN 'PURCHASE_RETURN' THEN 'DMP'
        ELSE 'DOC'
    END;

    SELECT COALESCE(MAX(CAST(SUBSTRING(number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO v_sequence
    FROM documents
    WHERE tenant_id = p_tenant_id
      AND doc_type = p_doc_type
      AND number ~ ('^' || v_prefix || '-[0-9]+$');

    v_padded := LPAD(v_sequence::TEXT, 5, '0');
    RETURN v_prefix || '-' || v_padded;
END;
$$;
