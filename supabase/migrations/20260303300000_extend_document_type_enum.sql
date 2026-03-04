-- Extend document_type enum to support quotations, sales orders, purchase orders, and vendor bills
-- Required for full ERP document lifecycle (Quote → SO → Invoice → Credit Note)
-- PostgreSQL 12+ allows ADD VALUE IF NOT EXISTS inside transactions

ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'QUOTATION';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'SALES_ORDER';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'VENDOR_BILL';

-- Also add missing columns to electronic_documents if not present (base schema may lack these)
ALTER TABLE electronic_documents ADD COLUMN IF NOT EXISTS cune TEXT;
ALTER TABLE electronic_documents ADD COLUMN IF NOT EXISTS xml_content TEXT;
ALTER TABLE electronic_documents ADD COLUMN IF NOT EXISTS dian_response JSONB;
ALTER TABLE electronic_documents ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE electronic_documents ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- Add balance column to documents if not present
ALTER TABLE documents ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES documents(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS notes_internal TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS notes_public TEXT;
