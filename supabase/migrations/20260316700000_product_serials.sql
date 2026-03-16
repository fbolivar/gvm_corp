CREATE TABLE IF NOT EXISTS product_serials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    product_id UUID NOT NULL REFERENCES products(id),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    serial_number TEXT NOT NULL,
    lot_id UUID REFERENCES product_lots(id),
    status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','RESERVED','SOLD','RETURNED','DEFECTIVE')),
    purchase_order_id UUID,
    movement_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, product_id, serial_number)
);
CREATE INDEX idx_serials_product ON product_serials(product_id, status);
CREATE INDEX idx_serials_warehouse ON product_serials(warehouse_id, status);
ALTER TABLE product_serials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON product_serials FOR ALL USING (tenant_id = get_my_tenant_id());
GRANT ALL ON product_serials TO authenticated;

ALTER TABLE products ADD COLUMN IF NOT EXISTS track_serials BOOLEAN DEFAULT false;
