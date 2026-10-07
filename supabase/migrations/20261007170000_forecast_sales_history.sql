-- PRP-008 Fase 1: histórico de ventas importado del informe de Viviana + alias de vendedor.
-- Fuente del forecast de compras (planeación de demanda). Datos sensibles de ventas:
-- solo accede Compras/gerencia (is_purchasing_manager).

CREATE OR REPLACE FUNCTION is_purchasing_manager()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_tenants ut
        WHERE ut.user_id = auth.uid()
          AND ut.tenant_id = get_my_tenant_id()
          AND ut.status = 'active'
          AND (
              -- Gestión del forecast + acceso al histórico/pronóstico de TODOS los comerciales:
              -- solo dirección de compras, gerencia y administradores. NO el can_edit general
              -- de 'purchasing' (lo tienen logística, tesorería, marketing, etc.).
              ut.role IN ('SUPER ADMINISTRADOR','ADMINISTRADOR','owner','admin','GENERAL MANAGER','DIRECTOR DE COMPRAS Y COMERCIO EXTERIOR')
              OR EXISTS (
                  SELECT 1 FROM role_permissions rp
                  WHERE rp.role_id = ut.role_id AND rp.module_key = 'purchasing' AND rp.can_admin = true
              )
          )
    );
$$;
REVOKE EXECUTE ON FUNCTION is_purchasing_manager() FROM anon, public;
GRANT EXECUTE ON FUNCTION is_purchasing_manager() TO authenticated;

CREATE TABLE IF NOT EXISTS forecast_salesperson_aliases (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    report_label    text NOT NULL,
    salesperson_id  uuid REFERENCES profiles(id),
    is_separate     boolean NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, report_label)
);

CREATE TABLE IF NOT EXISTS sales_history_import (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    year              int NOT NULL,
    month             int NOT NULL CHECK (month BETWEEN 1 AND 12),
    salesperson_label text NOT NULL,
    sku               text NOT NULL,
    product_label     text NOT NULL,
    product_id        uuid REFERENCES products(id),
    qty               numeric NOT NULL DEFAULT 0,
    value_cop         numeric NOT NULL DEFAULT 0,
    imported_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT sales_history_import_unique_key UNIQUE (tenant_id, year, month, salesperson_label, sku)
);
CREATE INDEX IF NOT EXISTS idx_sales_history_lookup
    ON sales_history_import (tenant_id, salesperson_label, year, month);

ALTER TABLE forecast_salesperson_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_history_import ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fsa_mgr_all" ON forecast_salesperson_aliases FOR ALL
    USING (tenant_id = get_my_tenant_id() AND is_purchasing_manager())
    WITH CHECK (tenant_id = get_my_tenant_id() AND is_purchasing_manager());

CREATE POLICY "shi_mgr_all" ON sales_history_import FOR ALL
    USING (tenant_id = get_my_tenant_id() AND is_purchasing_manager())
    WITH CHECK (tenant_id = get_my_tenant_id() AND is_purchasing_manager());
