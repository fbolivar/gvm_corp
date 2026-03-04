-- ============================================================================
-- Fix: zones table — ensure it exists, has proper grants, and correct RLS
-- Problem: zones created manually (no CREATE TABLE in migrations).
--          Missing GRANT for authenticated role → INSERT blocked silently.
-- ============================================================================

-- 1. Ensure table exists (idempotent for future deployments)
CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zones_tenant ON zones(tenant_id);

-- 2. Explicit GRANT — ensures authenticated role can CRUD
GRANT ALL ON TABLE zones TO authenticated;
GRANT ALL ON TABLE zones TO service_role;

-- 3. RLS — recreate with explicit WITH CHECK for INSERT/UPDATE
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zones_tenant_isolation" ON zones;
CREATE POLICY "zones_tenant_isolation" ON zones
    FOR ALL
    USING (tenant_id = get_my_tenant_id())
    WITH CHECK (tenant_id = get_my_tenant_id());
