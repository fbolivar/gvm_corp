-- Auditoría 2026-09-26: el backup .gvm nunca respaldaba app_roles/app_modules/
-- role_permissions (tablas globales sin tenant_id, filtradas por error en
-- silencio) ni 70 tablas reales más (contabilidad, tesorería, CRM, bodegas...),
-- y traía 2 nombres de tabla que no existen. Corregido en backupService.ts.
-- Esta columna hace visible cualquier fallo futuro en vez de tragárselo.
ALTER TABLE public.tenant_backups ADD COLUMN IF NOT EXISTS tables_skipped jsonb;

COMMENT ON COLUMN public.tenant_backups.tables_skipped IS
    'Tablas que se intentaron respaldar y fallaron, con su error. [] o NULL = respaldo completo de todas las tablas listadas en BACKUP_TABLES.';
