-- Fix: Add remaining missing columns to dian_resolutions
ALTER TABLE dian_resolutions ADD COLUMN IF NOT EXISTS resolution_date DATE;
ALTER TABLE dian_resolutions ADD COLUMN IF NOT EXISTS resolution_number TEXT;
ALTER TABLE dian_resolutions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
