-- Fecha de entrega estimada para pedidos/cotizaciones
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expected_delivery_date date;
COMMENT ON COLUMN documents.expected_delivery_date IS 'Fecha estimada de entrega (pedidos/cotizaciones)';
