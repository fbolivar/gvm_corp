-- Add currency column to purchase_orders
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'COP'
CHECK (currency IN ('COP', 'USD'));

COMMENT ON COLUMN purchase_orders.currency IS 'Currency for the purchase order: COP (Colombian Pesos) or USD (US Dollars)';
