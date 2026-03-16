-- ============================================================================
-- ATTENDANCE INTEGRATIONS: Geolocation, Auto-calculations, Schedules
-- ============================================================================

-- 1. New columns on payroll_attendance for geolocation & auto-calculations
ALTER TABLE payroll_attendance
    ADD COLUMN IF NOT EXISTS check_in_lat   NUMERIC(10,7),
    ADD COLUMN IF NOT EXISTS check_in_lng   NUMERIC(10,7),
    ADD COLUMN IF NOT EXISTS check_out_lat  NUMERIC(10,7),
    ADD COLUMN IF NOT EXISTS check_out_lng  NUMERIC(10,7),
    ADD COLUMN IF NOT EXISTS total_worked_hours NUMERIC(5,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS late_minutes   INT NOT NULL DEFAULT 0;

-- 2. Work Schedules (Turnos)
CREATE TABLE IF NOT EXISTS work_schedules (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT          NOT NULL,
    start_time      TIME          NOT NULL DEFAULT '08:00',
    end_time        TIME          NOT NULL DEFAULT '17:00',
    break_minutes   INT           NOT NULL DEFAULT 60,
    grace_minutes   INT           NOT NULL DEFAULT 15,
    is_night_shift  BOOLEAN       NOT NULL DEFAULT false,
    is_default      BOOLEAN       NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work_schedules_tenant_isolation" ON work_schedules
    FOR ALL USING (tenant_id = get_my_tenant_id());

CREATE INDEX IF NOT EXISTS idx_work_schedules_tenant
    ON work_schedules(tenant_id);

-- 3. Attendance Geo Zones (valid work locations)
CREATE TABLE IF NOT EXISTS attendance_geo_zones (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT          NOT NULL,
    lat             NUMERIC(10,7) NOT NULL,
    lng             NUMERIC(10,7) NOT NULL,
    radius_meters   INT           NOT NULL DEFAULT 200,
    is_active       BOOLEAN       NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE attendance_geo_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "geo_zones_tenant_isolation" ON attendance_geo_zones
    FOR ALL USING (tenant_id = get_my_tenant_id());

CREATE INDEX IF NOT EXISTS idx_geo_zones_tenant
    ON attendance_geo_zones(tenant_id);

-- 4. Add schedule_id to employees
ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES work_schedules(id) ON DELETE SET NULL;

-- 5. Seed default schedules for existing tenants
INSERT INTO work_schedules (tenant_id, name, start_time, end_time, break_minutes, grace_minutes, is_night_shift, is_default)
SELECT t.id, 'Jornada Normal', '08:00', '17:00', 60, 15, false, true
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM work_schedules ws WHERE ws.tenant_id = t.id AND ws.is_default = true
);

INSERT INTO work_schedules (tenant_id, name, start_time, end_time, break_minutes, grace_minutes, is_night_shift, is_default)
SELECT t.id, 'Turno Mañana', '06:00', '14:00', 30, 15, false, false
FROM tenants t;

INSERT INTO work_schedules (tenant_id, name, start_time, end_time, break_minutes, grace_minutes, is_night_shift, is_default)
SELECT t.id, 'Turno Tarde', '14:00', '22:00', 30, 15, false, false
FROM tenants t;
