-- ─── Módulo: Vacaciones & Ausencias ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS absence_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    absence_type    TEXT NOT NULL
        CHECK (absence_type IN ('VACATION', 'SICK_LEAVE', 'PERSONAL', 'UNPAID', 'MATERNITY', 'PATERNITY')),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    days            INT  NOT NULL CHECK (days > 0),
    reason          TEXT,
    status          TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by     UUID REFERENCES auth.users(id),
    reviewed_at     TIMESTAMPTZ,
    reviewer_notes  TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_absence_tenant  ON absence_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_absence_emp     ON absence_requests(employee_id, start_date DESC);

-- RLS
ALTER TABLE absence_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "absence_tenant_isolation" ON absence_requests
    USING (tenant_id = get_my_tenant_id());

CREATE POLICY "absence_insert" ON absence_requests
    FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());

CREATE POLICY "absence_update_reviewer" ON absence_requests
    FOR UPDATE USING (tenant_id = get_my_tenant_id());
