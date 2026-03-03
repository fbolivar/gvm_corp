-- ─── Módulo: Mantenimiento de Equipos ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS equipment (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code                  TEXT NOT NULL,
    name                  TEXT NOT NULL,
    brand                 TEXT,
    model                 TEXT,
    serial_number         TEXT,
    location              TEXT,
    status                TEXT NOT NULL DEFAULT 'ACTIVE'
                          CHECK (status IN ('ACTIVE', 'INACTIVE', 'RETIRED')),
    purchase_date         DATE,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    notes                 TEXT,
    created_at            TIMESTAMPTZ DEFAULT now(),
    UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS maintenance_orders (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    equipment_id     UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    order_type       TEXT NOT NULL
                     CHECK (order_type IN ('PREVENTIVE', 'CORRECTIVE', 'PREDICTIVE')),
    priority         TEXT NOT NULL DEFAULT 'MEDIUM'
                     CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status           TEXT NOT NULL DEFAULT 'PENDING'
                     CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    description      TEXT NOT NULL,
    technician_name  TEXT,
    scheduled_date   DATE NOT NULL,
    completed_date   DATE,
    estimated_cost   NUMERIC(12,2),
    actual_cost      NUMERIC(12,2),
    notes            TEXT,
    created_by       UUID REFERENCES auth.users(id),
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_equipment_tenant        ON equipment(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_maint_tenant_status     ON maintenance_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_maint_equipment         ON maintenance_orders(equipment_id, scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_maint_scheduled         ON maintenance_orders(tenant_id, scheduled_date);

-- RLS
ALTER TABLE equipment           ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_orders  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipment_tenant"  ON equipment          USING (tenant_id = get_my_tenant_id());
CREATE POLICY "equipment_insert"  ON equipment          FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "equipment_update"  ON equipment          FOR UPDATE USING (tenant_id = get_my_tenant_id());

CREATE POLICY "maint_tenant"  ON maintenance_orders     USING (tenant_id = get_my_tenant_id());
CREATE POLICY "maint_insert"  ON maintenance_orders     FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());
CREATE POLICY "maint_update"  ON maintenance_orders     FOR UPDATE USING (tenant_id = get_my_tenant_id());
