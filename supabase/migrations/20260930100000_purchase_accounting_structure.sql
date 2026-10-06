-- ═══════════════════════════════════════════════════════════════════════════
-- Contabilización automática de COMPRAS — estructura (infraestructura, no
-- se wirea a ningún documento todavía: hoy 0 VENDOR_BILL en el ERP, y Andrés
-- pidió revisar las tarifas EN VIVO antes de dar por cerrada la matriz).
--
-- Fuente: docs/CONTABILIZACION AUTOMATICA COMPRAS GVM.xlsx (matriz de cuentas
-- por tipo de contribuyente, igual estructura que ventas) + docs/sep/BASE
-- TARIFA Y RTE WO.xlsx (base y tarifa por cada cuenta de retención — a
-- diferencia de ventas, en compras la retención depende del CONCEPTO/cuenta,
-- no solo del tipo de contribuyente, por eso es una tabla aparte en vez de
-- reutilizar tax_configurations).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Reglas de contabilización de compras ────────────────────────────────
-- Espejo de accounting_rules (ventas), con dos diferencias: doc_kind usa los
-- códigos literales de World Office (CREM = factura de compra/recepción de
-- mercancía, DMP = devolución de mercancía a proveedor) en vez de FV/NC, y el
-- set de conceptos es el de compras (inventario en vez de ingreso).
CREATE TABLE IF NOT EXISTS public.purchase_accounting_rules (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    doc_kind      text NOT NULL CHECK (doc_kind IN ('CREM', 'DMP')),
    iva_rate      numeric(5,2) NOT NULL,
    payment_form  public.payment_form NOT NULL,
    taxpayer_code text NOT NULL REFERENCES public.taxpayer_types(code),
    account_code  text NOT NULL,
    nature        char(1) NOT NULL CHECK (nature IN ('D', 'C')),
    concept       text NOT NULL CHECK (concept IN (
                      'INVENTARIO', 'PROVEEDORES', 'IVA',
                      'RETEFUENTE', 'RETEICA', 'RETEIVA')),
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, doc_kind, iva_rate, payment_form, taxpayer_code, account_code, nature)
);

CREATE INDEX IF NOT EXISTS idx_purchase_accounting_rules_lookup
    ON public.purchase_accounting_rules (tenant_id, doc_kind, payment_form, taxpayer_code, iva_rate);

COMMENT ON TABLE public.purchase_accounting_rules IS
  'Matriz de contabilización de compras del contador: cada fila es una línea del asiento. Sin wirear a ningún flujo todavía — infraestructura para cuando existan VENDOR_BILL reales.';

ALTER TABLE public.purchase_accounting_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS purchase_accounting_rules_tenant ON public.purchase_accounting_rules;
CREATE POLICY purchase_accounting_rules_tenant ON public.purchase_accounting_rules
    FOR ALL
    USING (tenant_id = (SELECT get_my_tenant_id()))
    WITH CHECK (tenant_id = (SELECT get_my_tenant_id()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_accounting_rules TO authenticated, service_role;

-- ── 2. Bases y tarifas de retención de compras, POR CUENTA ─────────────────
-- A diferencia de ventas (una tarifa por tax_type), en compras la retención
-- depende del CONCEPTO del gasto (honorarios ≠ servicios ≠ compras ≠
-- arrendamiento), cada uno con su propia cuenta contable de retención — por
-- eso la clave es account_code, tal como lo entregó Andrés en
-- "BASE TARIFA Y RTE WO.xlsx" (139 cuentas, columnas IdCuentaContable/IdRet/
-- Porcentaje). Cubre retefuente (236xxx), reteICA (2368xxx) y reteIVA
-- (2367xxx) de compras, además de fuente/ICA de VENTAS (135515xx) que quedan
-- aquí también porque vinieron en la misma tabla — no se duplican, ya existen
-- en tax_configurations para el uso que hace hoy el motor de ventas.
CREATE TABLE IF NOT EXISTS public.purchase_tax_rates (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    account_code text NOT NULL,
    min_base     numeric(14,2) NOT NULL DEFAULT 0,
    rate         numeric(7,4) NOT NULL DEFAULT 0,
    year         int NOT NULL,
    is_active    boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, account_code, year)
);

COMMENT ON COLUMN public.purchase_tax_rates.rate IS
  'Tarifa en porcentaje (2.5 = 2,5%), igual convención que tax_configurations.rate.';
COMMENT ON COLUMN public.purchase_tax_rates.account_code IS
  'Cuenta de retención de World Office (ej. 23654001 = retención por compras declarantes 2,5%). Es la clave, no el tipo de contribuyente.';

ALTER TABLE public.purchase_tax_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS purchase_tax_rates_tenant ON public.purchase_tax_rates;
CREATE POLICY purchase_tax_rates_tenant ON public.purchase_tax_rates
    FOR ALL
    USING (tenant_id = (SELECT get_my_tenant_id()))
    WITH CHECK (tenant_id = (SELECT get_my_tenant_id()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_tax_rates TO authenticated, service_role;
