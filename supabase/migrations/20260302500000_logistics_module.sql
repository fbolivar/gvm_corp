-- =============================================
-- MÓDULO: Logística & Despachos
-- Fecha: 2026-03-02
-- Descripción: Tablas para gestión de despachos,
--              transportadoras y guías de envío.
-- =============================================

-- 1. Transportadoras
CREATE TABLE IF NOT EXISTS logistics_carriers (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name         TEXT         NOT NULL,
    nit          TEXT,
    contact_name TEXT,
    phone        TEXT,
    email        TEXT,
    is_active    BOOLEAN      NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 2. Despachos (cabezera)
CREATE TABLE IF NOT EXISTS logistics_shipments (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id         UUID         NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
    carrier_id       UUID         REFERENCES logistics_carriers(id) ON DELETE SET NULL,
    warehouse_id     UUID         REFERENCES warehouses(id) ON DELETE SET NULL,
    tracking_number  TEXT,
    status           TEXT         NOT NULL DEFAULT 'PENDING'
                                  CHECK (status IN ('PENDING','PACKED','SHIPPED','DELIVERED','RETURNED')),
    shipped_at       TIMESTAMPTZ,
    delivered_at     TIMESTAMPTZ,
    notes            TEXT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 3. Ítems de despacho
CREATE TABLE IF NOT EXISTS logistics_shipment_items (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id  UUID         NOT NULL REFERENCES logistics_shipments(id) ON DELETE CASCADE,
    product_id   UUID         NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    qty_ordered  NUMERIC(15,4) NOT NULL DEFAULT 0,
    qty_shipped  NUMERIC(15,4) NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE logistics_carriers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_shipments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_shipment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carrier_tenant_isolation" ON logistics_carriers
    FOR ALL USING (tenant_id = get_my_tenant_id());

CREATE POLICY "shipment_tenant_isolation" ON logistics_shipments
    FOR ALL USING (tenant_id = get_my_tenant_id());

CREATE POLICY "shipment_items_via_shipment" ON logistics_shipment_items
    FOR ALL USING (
        shipment_id IN (
            SELECT id FROM logistics_shipments
            WHERE tenant_id = get_my_tenant_id()
        )
    );

-- Índices
CREATE INDEX IF NOT EXISTS idx_logistics_shipments_tenant_status
    ON logistics_shipments(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_logistics_shipments_order
    ON logistics_shipments(order_id);

CREATE INDEX IF NOT EXISTS idx_logistics_items_shipment
    ON logistics_shipment_items(shipment_id);
