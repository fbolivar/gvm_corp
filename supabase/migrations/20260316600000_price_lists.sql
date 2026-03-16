CREATE TABLE IF NOT EXISTS price_lists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    currency TEXT DEFAULT 'COP',
    valid_from DATE,
    valid_to DATE,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON price_lists FOR ALL USING (tenant_id = get_my_tenant_id());
GRANT ALL ON price_lists TO authenticated;

CREATE TABLE IF NOT EXISTS price_list_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    price_list_id UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    unit_price NUMERIC(15,2) NOT NULL,
    min_qty NUMERIC(12,2) DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(price_list_id, product_id, min_qty)
);
ALTER TABLE price_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON price_list_items FOR ALL USING (tenant_id = get_my_tenant_id());
GRANT ALL ON price_list_items TO authenticated;

ALTER TABLE parties ADD COLUMN IF NOT EXISTS price_list_id UUID REFERENCES price_lists(id);
