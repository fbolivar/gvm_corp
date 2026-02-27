-- CRM Tables: leads + crm_opportunities with RLS tenant isolation
-- Uses get_my_tenant_id() SECURITY DEFINER function (already exists in governance migration)

CREATE TABLE IF NOT EXISTS leads (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    company_name TEXT,
    email       TEXT,
    phone       TEXT,
    status      TEXT NOT NULL DEFAULT 'NEW'
                    CHECK (status IN ('NEW','CONTACTED','QUALIFIED','LOST','CONVERTED')),
    source      TEXT,
    notes       TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_opportunities (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    description         TEXT,
    value               NUMERIC(18,2) NOT NULL DEFAULT 0,
    probability         NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
    stage               TEXT NOT NULL DEFAULT 'PROSPECTING'
                            CHECK (stage IN ('PROSPECTING','QUALIFICATION','PROPOSAL','NEGOTIATION','CLOSED_WON','CLOSED_LOST')),
    expected_close_date DATE,
    lead_id             UUID REFERENCES leads(id) ON DELETE SET NULL,
    party_id            UUID REFERENCES parties(id) ON DELETE SET NULL,
    assigned_to         UUID REFERENCES auth.users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_opp_tenant ON crm_opportunities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_opp_stage ON crm_opportunities(tenant_id, stage);

-- RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_opportunities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any, then recreate (idempotent)
DROP POLICY IF EXISTS leads_tenant_isolation ON leads;
DROP POLICY IF EXISTS crm_opp_tenant_isolation ON crm_opportunities;

CREATE POLICY leads_tenant_isolation ON leads
    USING (tenant_id = get_my_tenant_id())
    WITH CHECK (tenant_id = get_my_tenant_id());

CREATE POLICY crm_opp_tenant_isolation ON crm_opportunities
    USING (tenant_id = get_my_tenant_id())
    WITH CHECK (tenant_id = get_my_tenant_id());

-- updated_at trigger (reuse pattern from other tables)
CREATE OR REPLACE FUNCTION update_crm_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

DROP TRIGGER IF EXISTS crm_opp_updated_at ON crm_opportunities;
CREATE TRIGGER crm_opp_updated_at
    BEFORE UPDATE ON crm_opportunities
    FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();
