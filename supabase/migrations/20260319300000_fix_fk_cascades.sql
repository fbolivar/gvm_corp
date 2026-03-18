-- ============================================================================
-- Fix missing ON DELETE CASCADE on product_serials and product_lots
-- Prevents orphaned records when products/warehouses are deleted
-- ============================================================================

-- product_serials: product_id
DO $$ BEGIN
    ALTER TABLE product_serials
        DROP CONSTRAINT IF EXISTS product_serials_product_id_fkey;
    ALTER TABLE product_serials
        ADD CONSTRAINT product_serials_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'product_serials product_id FK: %', SQLERRM;
END $$;

-- product_serials: warehouse_id
DO $$ BEGIN
    ALTER TABLE product_serials
        DROP CONSTRAINT IF EXISTS product_serials_warehouse_id_fkey;
    ALTER TABLE product_serials
        ADD CONSTRAINT product_serials_warehouse_id_fkey
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'product_serials warehouse_id FK: %', SQLERRM;
END $$;

-- product_lots: product_id
DO $$ BEGIN
    ALTER TABLE product_lots
        DROP CONSTRAINT IF EXISTS product_lots_product_id_fkey;
    ALTER TABLE product_lots
        ADD CONSTRAINT product_lots_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'product_lots product_id FK: %', SQLERRM;
END $$;
