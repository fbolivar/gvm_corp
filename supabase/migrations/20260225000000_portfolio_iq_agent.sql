-- PRP-005: Agente Autónomo de Cobro de Cartera (Portfolio IQ Agent) v2
-- Dependencias: tenants, documents, parties

-- 1. Configuration for the collection agent
CREATE TABLE IF NOT EXISTS collection_agent_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    is_active BOOLEAN DEFAULT FALSE,
    grace_days INTEGER DEFAULT 5,
    reminder_frequency_days INTEGER DEFAULT 7,
    min_amount_threshold NUMERIC DEFAULT 0,
    auto_escalate_days INTEGER DEFAULT 90,
    tone TEXT DEFAULT 'PROFESSIONAL', -- PROFESSIONAL, FIRM, FRIENDLY
    email_template_v1 JSONB,
    config_json JSONB, -- For additional templates used by Edge Functions
    last_run_at TIMESTAMPTZ,
    last_run_status TEXT,
    last_run_results JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id)
);

-- 2. Actions taken by the agent
CREATE TABLE IF NOT EXISTS collection_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    document_id UUID REFERENCES documents(id),
    party_id UUID REFERENCES parties(id),
    action_type TEXT NOT NULL, -- REMINDER_1, REMINDER_2, FINAL_NOTICE, ESCALATE
    channel TEXT DEFAULT 'EMAIL', -- EMAIL, SYSTEM
    status TEXT DEFAULT 'PENDING', -- PENDING, SENT, FAILED
    metadata JSONB, -- Contenido enviado o error
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Debtor profiles with agent notes
CREATE TABLE IF NOT EXISTS debtor_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    party_id UUID REFERENCES parties(id),
    risk_level TEXT DEFAULT 'LOW', -- LOW, MEDIUM, HIGH, CRITICAL
    notes TEXT,
    excluded BOOLEAN DEFAULT FALSE,
    last_payment_date DATE,
    average_payment_days INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, party_id)
);

-- 4. Payment Allocations (Required for Metrics)
CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    document_id UUID REFERENCES documents(id),
    payment_id UUID, -- Placeholder for payment header
    amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Notifications (Used by Agent and System)
CREATE TABLE IF NOT EXISTS app_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES auth.users(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT,
    category TEXT DEFAULT 'GENERAL',
    priority TEXT DEFAULT 'MEDIUM',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --- ROW LEVEL SECURITY ---

ALTER TABLE collection_agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE debtor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Tenant Isolation Config" ON collection_agent_config;
CREATE POLICY "Tenant Isolation Config" ON collection_agent_config USING (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
);
CREATE POLICY "Service Role Config" ON collection_agent_config USING (true) WITH CHECK (true); -- Placeholder for Edge Functions

DROP POLICY IF EXISTS "Tenant Isolation Actions" ON collection_actions;
CREATE POLICY "Tenant Isolation Actions" ON collection_actions USING (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Tenant Isolation Profiles" ON debtor_profiles;
CREATE POLICY "Tenant Isolation Profiles" ON debtor_profiles USING (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Tenant Isolation Payment Allocations" ON payment_allocations;
CREATE POLICY "Tenant Isolation Payment Allocations" ON payment_allocations USING (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Tenant Isolation Notifications" ON app_notifications;
CREATE POLICY "Tenant Isolation Notifications" ON app_notifications USING (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
);

-- --- TRACING & UPDATED_AT ---
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_collection_agent_config_modtime
    BEFORE UPDATE ON collection_agent_config
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE OR REPLACE TRIGGER update_debtor_profiles_modtime
    BEFORE UPDATE ON debtor_profiles
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
