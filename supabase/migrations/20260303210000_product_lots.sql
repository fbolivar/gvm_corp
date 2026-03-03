-- ============================================================
-- Product Lots & Batch Expiration Tracking
-- Critical for veterinary pharmaceutical distribution
-- ============================================================

CREATE TABLE IF NOT EXISTS product_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    product_id UUID NOT NULL REFERENCES products(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),

    lot_number TEXT NOT NULL,
    batch_code TEXT,                          -- Manufacturer batch code

    qty NUMERIC(12,2) NOT NULL DEFAULT 0,    -- Current quantity in this lot
    cost NUMERIC(14,2) NOT NULL DEFAULT 0,   -- Unit cost for this lot

    manufacture_date DATE,
    expiration_date DATE NOT NULL,

    supplier_id UUID REFERENCES parties(id), -- Proveedor de origen

    status TEXT NOT NULL DEFAULT 'ACTIVE'     -- ACTIVE, QUARANTINE, EXPIRED, DEPLETED
        CHECK (status IN ('ACTIVE', 'QUARANTINE', 'EXPIRED', 'DEPLETED')),

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_product_lots_tenant ON product_lots(tenant_id);
CREATE INDEX idx_product_lots_product ON product_lots(product_id);
CREATE INDEX idx_product_lots_expiration ON product_lots(expiration_date);
CREATE INDEX idx_product_lots_status ON product_lots(status);
CREATE UNIQUE INDEX idx_product_lots_unique ON product_lots(tenant_id, product_id, warehouse_id, lot_number);

-- RLS
ALTER TABLE product_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON product_lots
    USING (tenant_id = get_my_tenant_id());

CREATE POLICY "Tenant insert" ON product_lots
    FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());

CREATE POLICY "Tenant update" ON product_lots
    FOR UPDATE USING (tenant_id = get_my_tenant_id());

-- ============================================================
-- RPC: Get lots near expiration
-- ============================================================
CREATE OR REPLACE FUNCTION get_expiring_lots(
    p_days_ahead INT DEFAULT 90,
    p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    lot_number TEXT,
    batch_code TEXT,
    product_id UUID,
    product_name TEXT,
    product_sku TEXT,
    warehouse_name TEXT,
    qty NUMERIC,
    cost NUMERIC,
    expiration_date DATE,
    days_until_expiry INT,
    status TEXT,
    supplier_name TEXT
)
LANGUAGE sql SECURITY DEFINER
AS $$
    SELECT
        pl.id,
        pl.lot_number,
        pl.batch_code,
        pl.product_id,
        p.name AS product_name,
        p.sku AS product_sku,
        w.name AS warehouse_name,
        pl.qty,
        pl.cost,
        pl.expiration_date,
        (pl.expiration_date - CURRENT_DATE)::INT AS days_until_expiry,
        pl.status,
        pa.legal_name AS supplier_name
    FROM product_lots pl
    JOIN products p ON p.id = pl.product_id
    JOIN warehouses w ON w.id = pl.warehouse_id
    LEFT JOIN parties pa ON pa.id = pl.supplier_id
    WHERE pl.tenant_id = get_my_tenant_id()
      AND pl.qty > 0
      AND pl.status IN ('ACTIVE', 'QUARANTINE')
      AND (pl.expiration_date - CURRENT_DATE) <= p_days_ahead
      AND (
          p_search IS NULL
          OR p.name ILIKE '%' || p_search || '%'
          OR p.sku ILIKE '%' || p_search || '%'
          OR pl.lot_number ILIKE '%' || p_search || '%'
      )
    ORDER BY pl.expiration_date ASC;
$$;

-- ============================================================
-- RPC: Summary dashboard stats
-- ============================================================
CREATE OR REPLACE FUNCTION get_lot_summary()
RETURNS TABLE (
    total_lots BIGINT,
    active_lots BIGINT,
    expired_lots BIGINT,
    expiring_30d BIGINT,
    expiring_90d BIGINT,
    quarantine_lots BIGINT,
    total_value NUMERIC
)
LANGUAGE sql SECURITY DEFINER
AS $$
    SELECT
        COUNT(*) FILTER (WHERE qty > 0) AS total_lots,
        COUNT(*) FILTER (WHERE status = 'ACTIVE' AND qty > 0) AS active_lots,
        COUNT(*) FILTER (WHERE expiration_date < CURRENT_DATE AND qty > 0) AS expired_lots,
        COUNT(*) FILTER (WHERE status = 'ACTIVE' AND qty > 0 AND expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30) AS expiring_30d,
        COUNT(*) FILTER (WHERE status = 'ACTIVE' AND qty > 0 AND expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 90) AS expiring_90d,
        COUNT(*) FILTER (WHERE status = 'QUARANTINE' AND qty > 0) AS quarantine_lots,
        COALESCE(SUM(qty * cost) FILTER (WHERE status = 'ACTIVE' AND qty > 0), 0) AS total_value
    FROM product_lots
    WHERE tenant_id = get_my_tenant_id();
$$;
