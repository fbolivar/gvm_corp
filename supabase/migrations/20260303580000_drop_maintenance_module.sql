-- ─── Drop Maintenance Module ─────────────────────────────────────────────────
-- This module is no longer needed for this application.

-- 1. Drop audit trigger
DROP TRIGGER IF EXISTS trg_audit_maintenance_orders ON maintenance_orders;

-- 2. Drop RLS policies
DROP POLICY IF EXISTS "maint_tenant"  ON maintenance_orders;
DROP POLICY IF EXISTS "maint_insert"  ON maintenance_orders;
DROP POLICY IF EXISTS "maint_update"  ON maintenance_orders;
DROP POLICY IF EXISTS "equipment_tenant"  ON equipment;
DROP POLICY IF EXISTS "equipment_insert"  ON equipment;
DROP POLICY IF EXISTS "equipment_update"  ON equipment;

-- 3. Drop tables (orders first due to FK)
DROP TABLE IF EXISTS maintenance_orders CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;

-- 4. Remove module from app_modules
DELETE FROM role_permissions WHERE module_key = 'maintenance';
DELETE FROM app_modules WHERE key = 'maintenance';
