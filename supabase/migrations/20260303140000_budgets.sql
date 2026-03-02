-- =============================================
-- MÓDULO: Presupuesto Anual
-- Fecha: 2026-03-03
-- Descripción: Presupuestos anuales con comparativo real vs presupuestado
-- =============================================

CREATE TABLE IF NOT EXISTS budgets (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        TEXT          NOT NULL,
    year        INT           NOT NULL,
    status      TEXT          NOT NULL DEFAULT 'DRAFT'
                              CHECK (status IN ('DRAFT','APPROVED','CLOSED')),
    notes       TEXT,
    created_by  UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, year, name)
);

CREATE TABLE IF NOT EXISTS budget_lines (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id        UUID          NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    tenant_id        UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category         TEXT          NOT NULL,
    account_name     TEXT          NOT NULL,
    sort_order       INT           NOT NULL DEFAULT 0,
    m01  NUMERIC(15,2) NOT NULL DEFAULT 0,
    m02  NUMERIC(15,2) NOT NULL DEFAULT 0,
    m03  NUMERIC(15,2) NOT NULL DEFAULT 0,
    m04  NUMERIC(15,2) NOT NULL DEFAULT 0,
    m05  NUMERIC(15,2) NOT NULL DEFAULT 0,
    m06  NUMERIC(15,2) NOT NULL DEFAULT 0,
    m07  NUMERIC(15,2) NOT NULL DEFAULT 0,
    m08  NUMERIC(15,2) NOT NULL DEFAULT 0,
    m09  NUMERIC(15,2) NOT NULL DEFAULT 0,
    m10  NUMERIC(15,2) NOT NULL DEFAULT 0,
    m11  NUMERIC(15,2) NOT NULL DEFAULT 0,
    m12  NUMERIC(15,2) NOT NULL DEFAULT 0
);

-- RLS
ALTER TABLE budgets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_lines ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='budgets' AND policyname='budgets_tenant') THEN
        CREATE POLICY "budgets_tenant" ON budgets FOR ALL
            USING (tenant_id = get_my_tenant_id())
            WITH CHECK (tenant_id = get_my_tenant_id());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='budget_lines' AND policyname='budget_lines_tenant') THEN
        CREATE POLICY "budget_lines_tenant" ON budget_lines FOR ALL
            USING (tenant_id = get_my_tenant_id())
            WITH CHECK (tenant_id = get_my_tenant_id());
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_budgets_tenant ON budgets(tenant_id, year DESC);
CREATE INDEX IF NOT EXISTS idx_budget_lines_budget ON budget_lines(budget_id, category);
