-- =============================================
-- MÓDULO: Control de Asistencia
-- Fecha: 2026-03-02
-- Descripción: Registro diario de asistencia
--              de empleados (entradas, salidas,
--              horas extra y estado del día).
-- =============================================

CREATE TABLE IF NOT EXISTS payroll_attendance (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id     UUID          NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    work_date       DATE          NOT NULL,
    check_in        TIMESTAMPTZ,
    check_out       TIMESTAMPTZ,
    status          TEXT          NOT NULL DEFAULT 'PRESENT'
                                  CHECK (status IN ('PRESENT','LATE','ABSENT','HOLIDAY')),
    overtime_hours  NUMERIC(5,2)  NOT NULL DEFAULT 0,
    night_hours     NUMERIC(5,2)  NOT NULL DEFAULT 0,
    sunday_hours    NUMERIC(5,2)  NOT NULL DEFAULT 0,
    notes           TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (employee_id, work_date)
);

-- RLS
ALTER TABLE payroll_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_tenant_isolation" ON payroll_attendance
    FOR ALL USING (tenant_id = get_my_tenant_id());

-- Índices
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date
    ON payroll_attendance(employee_id, work_date);

CREATE INDEX IF NOT EXISTS idx_attendance_tenant_date
    ON payroll_attendance(tenant_id, work_date);
