-- Metas mensuales de venta por comercial (módulo CRM → tablero del gerente).
--
-- Una fila por comercial y mes ('YYYY-MM'). La venta lograda NO se guarda:
-- se calcula en vivo sumando los pedidos facturados (SALES_ORDER ACCEPTED) de
-- los clientes cuya cartera tiene asignada el comercial (parties.salesperson_id).
-- Así la meta y el logro siempre cuadran con lo que muestra Ventas.

CREATE TABLE IF NOT EXISTS public.crm_sales_targets (
    id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       uuid NOT NULL DEFAULT get_my_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
    salesperson_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    period          text NOT NULL CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
    target_amount   numeric(15,2) NOT NULL DEFAULT 0 CHECK (target_amount >= 0),
    target_visits   integer NOT NULL DEFAULT 0 CHECK (target_visits >= 0),
    created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, salesperson_id, period)
);

CREATE INDEX IF NOT EXISTS idx_crm_sales_targets_period ON public.crm_sales_targets(tenant_id, period);

ALTER TABLE public.crm_sales_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_sales_targets_tenant ON public.crm_sales_targets;
CREATE POLICY crm_sales_targets_tenant ON public.crm_sales_targets
    FOR ALL USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());

DROP TRIGGER IF EXISTS trg_crm_sales_targets_updated_at ON public.crm_sales_targets;
CREATE TRIGGER trg_crm_sales_targets_updated_at BEFORE UPDATE ON public.crm_sales_targets
    FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();

COMMENT ON TABLE public.crm_sales_targets IS 'Meta mensual de venta y de visitas por comercial. El logro se calcula en vivo desde los pedidos facturados de su cartera.';

-- La cartera se consulta constantemente por comercial.
CREATE INDEX IF NOT EXISTS idx_parties_salesperson ON public.parties(tenant_id, salesperson_id) WHERE salesperson_id IS NOT NULL;
