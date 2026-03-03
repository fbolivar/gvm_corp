-- ─── Módulo: Control de Calidad QC ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quality_inspections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    stage               TEXT NOT NULL
        CHECK (stage IN ('INCOMING', 'IN_PROCESS', 'OUTGOING')),
    ref_type            TEXT,     -- 'PURCHASE_ORDER' | 'PRODUCTION_ORDER' | 'SALES_ORDER'
    ref_id              UUID,
    product_id          UUID REFERENCES products(id),
    lot_number          TEXT,
    quantity_inspected  NUMERIC(12,2) NOT NULL CHECK (quantity_inspected > 0),
    quantity_approved   NUMERIC(12,2) NOT NULL DEFAULT 0,
    quantity_rejected   NUMERIC(12,2) NOT NULL DEFAULT 0,
    result              TEXT NOT NULL
        CHECK (result IN ('APPROVED', 'REJECTED', 'CONDITIONAL')),
    inspector_id        UUID REFERENCES auth.users(id),
    inspection_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quality_ncrs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    inspection_id       UUID REFERENCES quality_inspections(id) ON DELETE SET NULL,
    ncr_number          TEXT NOT NULL,
    description         TEXT NOT NULL,
    severity            TEXT NOT NULL
        CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    root_cause          TEXT,
    corrective_action   TEXT,
    status              TEXT NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'IN_PROGRESS', 'CLOSED')),
    created_at          TIMESTAMPTZ DEFAULT now(),
    closed_at           TIMESTAMPTZ
);

-- Secuencia de NCR por tenant (número único)
CREATE SEQUENCE IF NOT EXISTS quality_ncr_seq START 1001 INCREMENT 1;

-- Índices
CREATE INDEX IF NOT EXISTS idx_qi_tenant_date  ON quality_inspections(tenant_id, inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_qi_stage        ON quality_inspections(tenant_id, stage);
CREATE INDEX IF NOT EXISTS idx_qncr_tenant     ON quality_ncrs(tenant_id, status);

-- RLS
ALTER TABLE quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_ncrs        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qi_tenant" ON quality_inspections
    USING (tenant_id = get_my_tenant_id());
CREATE POLICY "qi_insert" ON quality_inspections
    FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "qi_update" ON quality_inspections
    FOR UPDATE USING (tenant_id = get_my_tenant_id());

CREATE POLICY "qncr_tenant" ON quality_ncrs
    USING (tenant_id = get_my_tenant_id());
CREATE POLICY "qncr_insert" ON quality_ncrs
    FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "qncr_update" ON quality_ncrs
    FOR UPDATE USING (tenant_id = get_my_tenant_id());
