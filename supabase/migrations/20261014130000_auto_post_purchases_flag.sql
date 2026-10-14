-- Interruptor de contabilización AUTOMÁTICA de compras (compra remisionada).
--
-- El motor de compras (purchase_accounting_rules + purchaseAccountingEngine) ya
-- está validado por el contador, pero él debe dar el visto bueno final antes de
-- "encender" el posteo automático. Este flag deja el enganche desplegado pero
-- APAGADO: mientras sea false, registrar un VENDOR_BILL no genera asiento (igual
-- que hoy). Cuando el contador autorice, se pone en true (sin re-desplegar).
--
-- Default false = seguro: desplegar no cambia el comportamiento actual.
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS auto_post_purchases boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN tenants.auto_post_purchases IS
    'Si true, registrar una compra remisionada (VENDOR_BILL) genera el asiento contable automático con purchase_accounting_rules. Lo enciende el contador tras validar.';
