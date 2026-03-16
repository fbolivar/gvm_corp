-- =============================================
-- CRM Opportunity Activities / Progress Log
-- 2026-03-16
-- =============================================

CREATE TABLE IF NOT EXISTS crm_opportunity_activities (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    opportunity_id UUID NOT NULL REFERENCES crm_opportunities(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES auth.users(id),
    type        TEXT NOT NULL DEFAULT 'NOTE',  -- STAGE_CHANGE, NOTE, CALL, EMAIL, MEETING, TASK
    title       TEXT NOT NULL,
    description TEXT,
    old_stage   TEXT,
    new_stage   TEXT,
    old_probability INT,
    new_probability INT,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast lookups by opportunity
CREATE INDEX idx_crm_opp_activities_opp ON crm_opportunity_activities(opportunity_id, created_at DESC);

-- RLS
ALTER TABLE crm_opportunity_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON crm_opportunity_activities
    FOR ALL USING (tenant_id = get_my_tenant_id());

-- Grant
GRANT ALL ON crm_opportunity_activities TO authenticated;
