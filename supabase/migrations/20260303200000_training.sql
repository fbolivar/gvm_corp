-- ─── Módulo: Capacitación de Empleados ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS training_programs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code             TEXT NOT NULL,
    name             TEXT NOT NULL,
    description      TEXT,
    category         TEXT NOT NULL DEFAULT 'TECHNICAL'
                     CHECK (category IN ('SAFETY', 'TECHNICAL', 'QUALITY', 'MANAGEMENT', 'COMPLIANCE', 'INDUCTION')),
    duration_hours   NUMERIC(5,1) NOT NULL DEFAULT 1,
    is_mandatory     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ DEFAULT now(),
    UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS training_records (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id        UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    program_id         UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    scheduled_date     DATE NOT NULL,
    completion_date    DATE,
    score              NUMERIC(5,2),                 -- 0–100
    status             TEXT NOT NULL DEFAULT 'SCHEDULED'
                       CHECK (status IN ('SCHEDULED', 'COMPLETED', 'FAILED', 'CANCELLED')),
    certificate_number TEXT,
    notes              TEXT,
    created_at         TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tp_tenant       ON training_programs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tr_tenant       ON training_records(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tr_employee     ON training_records(employee_id, scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_tr_program      ON training_records(program_id);

-- RLS
ALTER TABLE training_programs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tp_tenant"  ON training_programs  USING (tenant_id = get_my_tenant_id());
CREATE POLICY "tp_insert"  ON training_programs  FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "tp_update"  ON training_programs  FOR UPDATE USING (tenant_id = get_my_tenant_id());

CREATE POLICY "tr_tenant"  ON training_records   USING (tenant_id = get_my_tenant_id());
CREATE POLICY "tr_insert"  ON training_records   FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "tr_update"  ON training_records   FOR UPDATE USING (tenant_id = get_my_tenant_id());
