-- Allow warehouse_id to be NULL on product_serials
-- Serials can be registered without a specific warehouse location
ALTER TABLE product_serials ALTER COLUMN warehouse_id DROP NOT NULL;
