-- ══════════════════════════════════════════════════════════════
-- MÓDULO DE PRESUPUESTO
-- Tablas: budgets, budget_lines
-- Flujo: Crear Presupuesto → Añadir Líneas → Comparar vs Ejecutado
-- ══════════════════════════════════════════════════════════════

-- ── budgets ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    year        INT  NOT NULL CHECK (year >= 2020 AND year <= 2099),
    period_type TEXT NOT NULL DEFAULT 'ANNUAL'
                CHECK (period_type IN ('ANNUAL', 'MONTHLY', 'QUARTERLY')),
    status      TEXT NOT NULL DEFAULT 'DRAFT'
                CHECK (status IN ('DRAFT', 'APPROVED', 'CLOSED')),
    total_income  NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_expense NUMERIC(18,2) NOT NULL DEFAULT 0,
    created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── budget_lines ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budget_lines (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    budget_id   UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    category    TEXT NOT NULL,           -- e.g. 'Ventas', 'COGS', 'Nómina', etc.
    subcategory TEXT,
    line_type   TEXT NOT NULL            -- 'INCOME' | 'EXPENSE'
                CHECK (line_type IN ('INCOME', 'EXPENSE')),
    month       INT  CHECK (month BETWEEN 1 AND 12), -- NULL = anual
    amount      NUMERIC(18,2) NOT NULL DEFAULT 0,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Índices ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_budgets_tenant  ON budgets(tenant_id, year DESC);
CREATE INDEX IF NOT EXISTS idx_budget_lines_bud ON budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_ten ON budget_lines(tenant_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE budgets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY budgets_tenant ON budgets
    FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    );

CREATE POLICY budget_lines_tenant ON budget_lines
    FOR ALL USING (
        tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    );

-- ── updated_at trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_budget_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_budgets_updated_at      ON budgets;
DROP TRIGGER IF EXISTS trg_budget_lines_updated_at ON budget_lines;

CREATE TRIGGER trg_budgets_updated_at
    BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_budget_updated_at();

CREATE TRIGGER trg_budget_lines_updated_at
    BEFORE UPDATE ON budget_lines
    FOR EACH ROW EXECUTE FUNCTION update_budget_updated_at();

-- ── Seed: presupuesto demo 2026 ───────────────────────────────
DO $$
DECLARE
    v_tenant_id UUID;
    v_user_id   UUID;
    v_budget_id UUID;
BEGIN
    -- Tomar el primer tenant y usuario admin
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    SELECT id INTO v_user_id   FROM auth.users LIMIT 1;

    IF v_tenant_id IS NULL THEN RETURN; END IF;

    INSERT INTO budgets (tenant_id, name, description, year, period_type, status, total_income, total_expense, created_by)
    VALUES (
        v_tenant_id,
        'Presupuesto Anual 2026',
        'Proyecciones financieras para el año fiscal 2026',
        2026, 'ANNUAL', 'APPROVED',
        480000000, 380000000,
        v_user_id
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_budget_id;

    IF v_budget_id IS NULL THEN RETURN; END IF;

    -- Líneas de ingresos
    INSERT INTO budget_lines (tenant_id, budget_id, category, line_type, amount) VALUES
        (v_tenant_id, v_budget_id, 'Ventas Productos',     'INCOME',  320000000),
        (v_tenant_id, v_budget_id, 'Servicios',            'INCOME',  120000000),
        (v_tenant_id, v_budget_id, 'Otros Ingresos',       'INCOME',   40000000);

    -- Líneas de gastos
    INSERT INTO budget_lines (tenant_id, budget_id, category, line_type, amount) VALUES
        (v_tenant_id, v_budget_id, 'Costo de Ventas',      'EXPENSE', 180000000),
        (v_tenant_id, v_budget_id, 'Nómina y Prestaciones','EXPENSE',  96000000),
        (v_tenant_id, v_budget_id, 'Arrendamiento',        'EXPENSE',  24000000),
        (v_tenant_id, v_budget_id, 'Marketing',            'EXPENSE',  18000000),
        (v_tenant_id, v_budget_id, 'Servicios Públicos',   'EXPENSE',   8000000),
        (v_tenant_id, v_budget_id, 'Tecnología',           'EXPENSE',  12000000),
        (v_tenant_id, v_budget_id, 'Impuestos y Aportes',  'EXPENSE',  28000000),
        (v_tenant_id, v_budget_id, 'Gastos Generales',     'EXPENSE',  14000000);
END $$;
