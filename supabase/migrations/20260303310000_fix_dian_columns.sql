-- Fix: Ensure all DIAN table columns exist (PostgREST schema cache issue)
-- Some columns may be missing if tables were created before the full migration

-- dian_config missing columns
ALTER TABLE dian_config ADD COLUMN IF NOT EXISTS pin TEXT;
ALTER TABLE dian_config ADD COLUMN IF NOT EXISTS technical_key TEXT;
ALTER TABLE dian_config ADD COLUMN IF NOT EXISTS certificate_b64 TEXT;
ALTER TABLE dian_config ADD COLUMN IF NOT EXISTS certificate_password TEXT;
ALTER TABLE dian_config ADD COLUMN IF NOT EXISTS test_set_id TEXT;
ALTER TABLE dian_config ADD COLUMN IF NOT EXISTS test_set_id_payroll TEXT;

-- dian_resolutions missing columns
ALTER TABLE dian_resolutions ADD COLUMN IF NOT EXISTS resolution_date DATE;
ALTER TABLE dian_resolutions ADD COLUMN IF NOT EXISTS resolution_number TEXT;
ALTER TABLE dian_resolutions ADD COLUMN IF NOT EXISTS doc_type TEXT NOT NULL DEFAULT 'INVOICE' CHECK (doc_type IN ('INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE', 'PAYROLL'));
ALTER TABLE dian_resolutions ADD COLUMN IF NOT EXISTS prefix TEXT NOT NULL DEFAULT '';
ALTER TABLE dian_resolutions ADD COLUMN IF NOT EXISTS valid_from DATE;
ALTER TABLE dian_resolutions ADD COLUMN IF NOT EXISTS valid_until DATE;
ALTER TABLE dian_resolutions ADD COLUMN IF NOT EXISTS from_number BIGINT NOT NULL DEFAULT 1;
ALTER TABLE dian_resolutions ADD COLUMN IF NOT EXISTS to_number BIGINT;
ALTER TABLE dian_resolutions ADD COLUMN IF NOT EXISTS current_number BIGINT NOT NULL DEFAULT 1;
ALTER TABLE dian_resolutions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'EXPIRED'));

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
