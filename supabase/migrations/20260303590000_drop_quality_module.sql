-- ─── Drop Quality QC Module ──────────────────────────────────────────────────

-- 1. Drop audit triggers
DROP TRIGGER IF EXISTS trg_audit_quality_inspections ON quality_inspections;
DROP TRIGGER IF EXISTS trg_audit_quality_ncrs ON quality_ncrs;

-- 2. Drop RLS policies
DROP POLICY IF EXISTS "qc_insp_tenant"  ON quality_inspections;
DROP POLICY IF EXISTS "qc_insp_insert"  ON quality_inspections;
DROP POLICY IF EXISTS "qc_insp_update"  ON quality_inspections;
DROP POLICY IF EXISTS "qc_ncr_tenant"   ON quality_ncrs;
DROP POLICY IF EXISTS "qc_ncr_insert"   ON quality_ncrs;
DROP POLICY IF EXISTS "qc_ncr_update"   ON quality_ncrs;

-- 3. Drop tables (NCRs reference inspections, so drop first)
DROP TABLE IF EXISTS quality_ncrs CASCADE;
DROP TABLE IF EXISTS quality_inspections CASCADE;

-- 4. Remove module from governance
DELETE FROM role_permissions WHERE module_key = 'quality';
DELETE FROM app_modules WHERE key = 'quality';
