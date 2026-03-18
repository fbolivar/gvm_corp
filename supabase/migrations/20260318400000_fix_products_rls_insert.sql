-- Fix: "new row violates row-level security policy for table products"
-- Root cause: products.tenant_id has no DEFAULT and RLS policy lacks WITH CHECK

-- 1. Add default tenant_id so inserts auto-populate it
ALTER TABLE products
ALTER COLUMN tenant_id SET DEFAULT get_my_tenant_id();

-- 2. Replace RLS policy with one that includes WITH CHECK for inserts
DROP POLICY IF EXISTS "products_tenant_isolation" ON products;
CREATE POLICY "products_tenant_isolation" ON products
    FOR ALL
    USING (tenant_id = get_my_tenant_id())
    WITH CHECK (tenant_id = get_my_tenant_id());
