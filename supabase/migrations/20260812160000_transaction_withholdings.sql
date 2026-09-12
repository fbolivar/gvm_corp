-- Detalle de retenciones por transacción de tesorería.
--
-- El código lleva desde siempre insertando en `transaction_withholdings` y leyendo
-- `tx.withholdings`, pero la tabla nunca se creó: el INSERT fallaba (sin comprobar
-- error) y las retenciones aplicadas a un pago no quedaban registradas en ningún
-- lado — solo se reflejaban en el asiento contable.

CREATE TABLE IF NOT EXISTS public.transaction_withholdings (
    id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       uuid NOT NULL DEFAULT get_my_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
    transaction_id  uuid NOT NULL REFERENCES public.treasury_transactions(id) ON DELETE CASCADE,
    withholding_id  uuid,
    base_amount     numeric(18,2) NOT NULL DEFAULT 0,
    applied_amount  numeric(18,2) NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transaction_withholdings_tx
    ON public.transaction_withholdings(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_withholdings_tenant
    ON public.transaction_withholdings(tenant_id);

ALTER TABLE public.transaction_withholdings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transaction_withholdings_tenant ON public.transaction_withholdings;
CREATE POLICY transaction_withholdings_tenant ON public.transaction_withholdings
    FOR ALL
    USING (tenant_id = get_my_tenant_id())
    WITH CHECK (tenant_id = get_my_tenant_id());

COMMENT ON TABLE public.transaction_withholdings IS
    'Retenciones aplicadas a una transacción de tesorería (base y valor retenido).';
