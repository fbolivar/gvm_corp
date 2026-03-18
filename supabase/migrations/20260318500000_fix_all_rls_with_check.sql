-- Fix: ALL tenant-isolated tables need WITH CHECK + DEFAULT tenant_id
-- Without WITH CHECK, INSERT operations are blocked by RLS
-- Without DEFAULT, tenant_id is NULL and doesn't match the policy

-- ============================================================
-- 1. Add DEFAULT get_my_tenant_id() to all tenant tables
-- ============================================================

-- parties
ALTER TABLE parties
ALTER COLUMN tenant_id SET DEFAULT get_my_tenant_id();

-- documents (may already have it, safe to re-run)
ALTER TABLE documents
ALTER COLUMN tenant_id SET DEFAULT get_my_tenant_id();

-- leads
ALTER TABLE leads
ALTER COLUMN tenant_id SET DEFAULT get_my_tenant_id();

-- audit_log
ALTER TABLE audit_log
ALTER COLUMN tenant_id SET DEFAULT get_my_tenant_id();

-- zones
ALTER TABLE zones
ALTER COLUMN tenant_id SET DEFAULT get_my_tenant_id();

-- inventory_movements (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'tenant_id') THEN
        EXECUTE 'ALTER TABLE inventory_movements ALTER COLUMN tenant_id SET DEFAULT get_my_tenant_id()';
    END IF;
END $$;

-- crm_opportunities (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_opportunities' AND column_name = 'tenant_id') THEN
        EXECUTE 'ALTER TABLE crm_opportunities ALTER COLUMN tenant_id SET DEFAULT get_my_tenant_id()';
    END IF;
END $$;

-- treasury_transactions (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'treasury_transactions' AND column_name = 'tenant_id') THEN
        EXECUTE 'ALTER TABLE treasury_transactions ALTER COLUMN tenant_id SET DEFAULT get_my_tenant_id()';
    END IF;
END $$;

-- ============================================================
-- 2. Recreate RLS policies with WITH CHECK clause
-- ============================================================

-- parties
DROP POLICY IF EXISTS "parties_tenant_isolation" ON parties;
CREATE POLICY "parties_tenant_isolation" ON parties
    FOR ALL
    USING (tenant_id = get_my_tenant_id())
    WITH CHECK (tenant_id = get_my_tenant_id());

-- documents
DROP POLICY IF EXISTS "documents_tenant_isolation" ON documents;
CREATE POLICY "documents_tenant_isolation" ON documents
    FOR ALL
    USING (tenant_id = get_my_tenant_id())
    WITH CHECK (tenant_id = get_my_tenant_id());

-- leads
DROP POLICY IF EXISTS "leads_tenant_isolation" ON leads;
CREATE POLICY "leads_tenant_isolation" ON leads
    FOR ALL
    USING (tenant_id = get_my_tenant_id())
    WITH CHECK (tenant_id = get_my_tenant_id());

-- audit_log
DROP POLICY IF EXISTS "audit_log_tenant_isolation" ON audit_log;
CREATE POLICY "audit_log_tenant_isolation" ON audit_log
    FOR ALL
    USING (tenant_id = get_my_tenant_id())
    WITH CHECK (tenant_id = get_my_tenant_id());

-- zones
DROP POLICY IF EXISTS "zones_tenant_isolation" ON zones;
CREATE POLICY "zones_tenant_isolation" ON zones
    FOR ALL
    USING (tenant_id = get_my_tenant_id())
    WITH CHECK (tenant_id = get_my_tenant_id());

-- inventory_movements
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'inventory_movements' AND schemaname = 'public') THEN
        EXECUTE 'DROP POLICY IF EXISTS "inv_movements_tenant_isolation" ON inventory_movements';
        EXECUTE 'CREATE POLICY "inv_movements_tenant_isolation" ON inventory_movements
            FOR ALL
            USING (tenant_id = get_my_tenant_id())
            WITH CHECK (tenant_id = get_my_tenant_id())';
    END IF;
END $$;

-- crm_opportunities
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'crm_opportunities' AND schemaname = 'public') THEN
        EXECUTE 'DROP POLICY IF EXISTS "crm_opp_tenant_isolation" ON crm_opportunities';
        EXECUTE 'CREATE POLICY "crm_opp_tenant_isolation" ON crm_opportunities
            FOR ALL
            USING (tenant_id = get_my_tenant_id())
            WITH CHECK (tenant_id = get_my_tenant_id())';
    END IF;
END $$;

-- treasury_transactions
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'treasury_transactions' AND schemaname = 'public') THEN
        EXECUTE 'DROP POLICY IF EXISTS "treasury_tenant_isolation" ON treasury_transactions';
        EXECUTE 'CREATE POLICY "treasury_tenant_isolation" ON treasury_transactions
            FOR ALL
            USING (tenant_id = get_my_tenant_id())
            WITH CHECK (tenant_id = get_my_tenant_id())';
    END IF;
END $$;
