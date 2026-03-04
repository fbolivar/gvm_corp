-- 1. Add barcode column to products (for barcode scanner overlay)
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS barcode TEXT;

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;

-- 2. Drop existing RPC (signature changed — cannot use CREATE OR REPLACE)
DROP FUNCTION IF EXISTS get_products_with_stock(INTEGER, INTEGER, TEXT);

-- 3. Create get_products_with_stock RPC
-- Returns all product columns + aggregated stock qty from product_stock
CREATE OR REPLACE FUNCTION get_products_with_stock(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_search TEXT DEFAULT ''
)
RETURNS TABLE (
    id UUID,
    tenant_id UUID,
    name TEXT,
    sku TEXT,
    type TEXT,
    uom TEXT,
    cost NUMERIC,
    selling_price NUMERIC,
    tax_category TEXT,
    status TEXT,
    min_stock NUMERIC,
    barcode TEXT,
    description TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    total_qty NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
    SELECT
        p.id,
        p.tenant_id,
        p.name,
        p.sku,
        p.type,
        p.uom,
        p.cost,
        p.selling_price,
        p.tax_category,
        p.status,
        p.min_stock,
        p.barcode,
        p.description,
        p.created_at,
        p.updated_at,
        COALESCE(SUM(ps.qty), 0) AS total_qty
    FROM products p
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    WHERE
        (p_search = '' OR p.name ILIKE '%' || p_search || '%' OR p.sku ILIKE '%' || p_search || '%')
    GROUP BY p.id
    ORDER BY p.name
    LIMIT p_limit
    OFFSET p_offset;
$$;
