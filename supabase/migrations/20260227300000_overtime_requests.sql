-- Módulo: Horas Extra (Overtime Requests)
-- Flujo: Empleado solicita → Notificación a jefe de logística → Aprobación/Rechazo

CREATE TABLE IF NOT EXISTS overtime_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    start_time      TIME,
    end_time        TIME,
    hours           NUMERIC(4,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
    reason          TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at     TIMESTAMPTZ,
    reviewer_notes  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_overtime_tenant   ON overtime_requests(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_overtime_employee ON overtime_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_overtime_pending  ON overtime_requests(tenant_id, status) WHERE status = 'PENDING';

-- RLS
ALTER TABLE overtime_requests ENABLE ROW LEVEL SECURITY;

-- Empleados: ven y crean sus propias solicitudes
CREATE POLICY overtime_employee_own ON overtime_requests
    FOR ALL
    USING (
        employee_id IN (
            SELECT id FROM employees
            WHERE user_id = auth.uid()
            AND tenant_id = overtime_requests.tenant_id
        )
    )
    WITH CHECK (
        employee_id IN (
            SELECT id FROM employees
            WHERE user_id = auth.uid()
            AND tenant_id = overtime_requests.tenant_id
        )
    );

-- Admins del tenant: ven y actualizan todas las solicitudes del tenant
CREATE POLICY overtime_admin_all ON overtime_requests
    FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants
            WHERE user_id = auth.uid()
        )
    );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_overtime_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_overtime_updated_at ON overtime_requests;
CREATE TRIGGER trg_overtime_updated_at
    BEFORE UPDATE ON overtime_requests
    FOR EACH ROW EXECUTE FUNCTION update_overtime_updated_at();
