-- Interruptor de contabilización AUTOMÁTICA de ventas.
--
-- La operación real de ventas, mientras la facturación sigue en WorldOffice, son
-- los PEDIDOS FACTURADOS (SALES_ORDER en estado ACCEPTED). El asiento de venta se
-- genera cuando el pedido se marca como facturado (markSalesOrderInvoicedAction),
-- tratándolo como factura de venta (FV) — igual que la simulación que validó el
-- contador. Al desmarcar, el asiento se revierte.
--
-- Default false = seguro: desplegar no cambia el comportamiento. Se enciende por
-- tenant tras el visto bueno del contador, sin re-desplegar.
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS auto_post_sales boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN tenants.auto_post_sales IS
    'Si true, marcar un pedido como facturado (o crear una factura/NC) genera el asiento de venta automático con accounting_rules. Lo enciende el contador tras validar.';
