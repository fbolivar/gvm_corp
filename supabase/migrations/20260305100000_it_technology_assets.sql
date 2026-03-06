-- ============================================================
-- IT Technology Assets Module (ITIL v4)
-- Tables: it_assets, it_asset_assignments, it_maintenance_schedules
-- ============================================================

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE it_asset_category AS ENUM ('DESKTOP','LAPTOP','MOBILE','TABLET','PRINTER','NETWORK','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE it_asset_status AS ENUM ('AVAILABLE','ASSIGNED','IN_MAINTENANCE','RETIRED','LOST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE it_asset_condition AS ENUM ('NEW','GOOD','FAIR','POOR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE it_maintenance_type AS ENUM ('PREVENTIVE','CORRECTIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE it_maintenance_status AS ENUM ('SCHEDULED','COMPLETED','OVERDUE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. TABLES

-- 2a. it_assets — CMDB
CREATE TABLE IF NOT EXISTS it_assets (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    asset_code    text UNIQUE,
    name          text NOT NULL,
    category      it_asset_category NOT NULL DEFAULT 'OTHER',
    brand         text,
    model         text,
    serial_number text,
    purchase_date date,
    purchase_cost numeric(14,2) DEFAULT 0,
    warranty_expiry date,
    status        it_asset_status NOT NULL DEFAULT 'AVAILABLE',
    condition     it_asset_condition NOT NULL DEFAULT 'NEW',
    specs         jsonb DEFAULT '{}',
    notes         text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, serial_number)
);

-- 2b. it_asset_assignments — historial de entregas
CREATE TABLE IF NOT EXISTS it_asset_assignments (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    asset_id        uuid NOT NULL REFERENCES it_assets(id) ON DELETE CASCADE,
    employee_id     uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    assigned_at     timestamptz NOT NULL DEFAULT now(),
    assigned_by     uuid REFERENCES profiles(id),
    returned_at     timestamptz,
    return_condition it_asset_condition,
    delivery_notes  text,
    return_notes    text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- 2c. it_maintenance_schedules — programa de mantenimiento
CREATE TABLE IF NOT EXISTS it_maintenance_schedules (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    asset_id          uuid NOT NULL REFERENCES it_assets(id) ON DELETE CASCADE,
    maintenance_type  it_maintenance_type NOT NULL DEFAULT 'PREVENTIVE',
    frequency_days    int DEFAULT 180,
    last_performed_at timestamptz,
    next_due_at       timestamptz NOT NULL,
    performed_by      text,
    notes             text,
    status            it_maintenance_status NOT NULL DEFAULT 'SCHEDULED',
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_it_assets_tenant_status ON it_assets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_it_assets_tenant_category ON it_assets(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_it_asset_assignments_asset ON it_asset_assignments(asset_id);
CREATE INDEX IF NOT EXISTS idx_it_asset_assignments_employee ON it_asset_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_it_maintenance_next_due ON it_maintenance_schedules(tenant_id, next_due_at);

-- 4. AUTO-CODE TRIGGER (IT-YYYY-NNNNN)
CREATE OR REPLACE FUNCTION generate_it_asset_code()
RETURNS trigger AS $$
DECLARE
    next_num int;
    yr text;
BEGIN
    yr := to_char(now(), 'YYYY');
    SELECT COALESCE(MAX(
        CAST(NULLIF(regexp_replace(asset_code, '^IT-' || yr || '-', ''), asset_code) AS int)
    ), 0) + 1
    INTO next_num
    FROM it_assets
    WHERE tenant_id = NEW.tenant_id
      AND asset_code LIKE 'IT-' || yr || '-%';

    NEW.asset_code := 'IT-' || yr || '-' || lpad(next_num::text, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_it_asset_code ON it_assets;
CREATE TRIGGER trg_it_asset_code
    BEFORE INSERT ON it_assets
    FOR EACH ROW
    WHEN (NEW.asset_code IS NULL)
    EXECUTE FUNCTION generate_it_asset_code();

-- 5. UPDATED_AT TRIGGERS
CREATE OR REPLACE FUNCTION update_it_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_it_assets_updated ON it_assets;
CREATE TRIGGER trg_it_assets_updated
    BEFORE UPDATE ON it_assets FOR EACH ROW
    EXECUTE FUNCTION update_it_updated_at();

DROP TRIGGER IF EXISTS trg_it_maintenance_updated ON it_maintenance_schedules;
CREATE TRIGGER trg_it_maintenance_updated
    BEFORE UPDATE ON it_maintenance_schedules FOR EACH ROW
    EXECUTE FUNCTION update_it_updated_at();

-- 6. RLS
ALTER TABLE it_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE it_asset_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE it_maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- it_assets
DROP POLICY IF EXISTS it_assets_tenant ON it_assets;
CREATE POLICY it_assets_tenant ON it_assets
    FOR ALL USING (tenant_id = get_my_tenant_id());

-- it_asset_assignments
DROP POLICY IF EXISTS it_asset_assignments_tenant ON it_asset_assignments;
CREATE POLICY it_asset_assignments_tenant ON it_asset_assignments
    FOR ALL USING (tenant_id = get_my_tenant_id());

-- it_maintenance_schedules
DROP POLICY IF EXISTS it_maintenance_tenant ON it_maintenance_schedules;
CREATE POLICY it_maintenance_tenant ON it_maintenance_schedules
    FOR ALL USING (tenant_id = get_my_tenant_id());

-- 7. GRANTS
GRANT ALL ON it_assets TO authenticated;
GRANT ALL ON it_asset_assignments TO authenticated;
GRANT ALL ON it_maintenance_schedules TO authenticated;

-- 8. GOVERNANCE — add 'technology' module + permissions
INSERT INTO app_modules (key, name, description, icon)
VALUES ('technology', 'Tecnología', 'Gestión de activos tecnológicos IT', 'Monitor')
ON CONFLICT (key) DO NOTHING;

-- Permisos para roles existentes
INSERT INTO role_permissions (role_id, module_key, can_view, can_edit, can_delete, can_admin)
SELECT r.id, 'technology', true, true, true, true
FROM app_roles r WHERE r.name IN ('SUPER ADMINISTRADOR', 'ADMINISTRADOR')
ON CONFLICT (role_id, module_key) DO NOTHING;

INSERT INTO role_permissions (role_id, module_key, can_view, can_edit, can_delete, can_admin)
SELECT r.id, 'technology', true, true, false, false
FROM app_roles r WHERE r.name IN ('GERENTE', 'JEFE DE AREA')
ON CONFLICT (role_id, module_key) DO NOTHING;

INSERT INTO role_permissions (role_id, module_key, can_view, can_edit, can_delete, can_admin)
SELECT r.id, 'technology', true, false, false, false
FROM app_roles r WHERE r.name NOT IN ('SUPER ADMINISTRADOR', 'ADMINISTRADOR', 'GERENTE', 'JEFE DE AREA')
ON CONFLICT (role_id, module_key) DO NOTHING;
