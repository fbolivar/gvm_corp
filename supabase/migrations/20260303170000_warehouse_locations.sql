-- ─── Módulo: Ubicaciones de Bodega ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS warehouse_locations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    aisle        TEXT NOT NULL,                  -- Pasillo (A, B, C…)
    rack         TEXT NOT NULL,                  -- Estante (01, 02…)
    position     TEXT NOT NULL DEFAULT '1',      -- Posición / Nivel
    label        TEXT GENERATED ALWAYS AS (aisle || '-' || rack || '-' || position) STORED,
    capacity     NUMERIC(10,2),                  -- Capacidad opcional (kg / unidades)
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ DEFAULT now(),
    UNIQUE (warehouse_id, aisle, rack, position)
);

CREATE INDEX IF NOT EXISTS idx_wh_locations_wh ON warehouse_locations(warehouse_id);

-- RLS: inherit from parent warehouse visibility — tenant isolation via warehouse
ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;

-- Allow access when the user can see the warehouse (warehouses use tenant RLS)
CREATE POLICY "wh_locations_select" ON warehouse_locations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM warehouses w
            WHERE w.id = warehouse_id
              AND w.tenant_id = get_my_tenant_id()
        )
    );

CREATE POLICY "wh_locations_insert" ON warehouse_locations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM warehouses w
            WHERE w.id = warehouse_id
              AND w.tenant_id = get_my_tenant_id()
        )
    );

CREATE POLICY "wh_locations_update" ON warehouse_locations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM warehouses w
            WHERE w.id = warehouse_id
              AND w.tenant_id = get_my_tenant_id()
        )
    );

CREATE POLICY "wh_locations_delete" ON warehouse_locations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM warehouses w
            WHERE w.id = warehouse_id
              AND w.tenant_id = get_my_tenant_id()
        )
    );
