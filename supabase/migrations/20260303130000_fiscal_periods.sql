-- =============================================
-- MÓDULO: Cierre Contable del Período
-- Fecha: 2026-03-03
-- Descripción: Períodos fiscales y checklist de cierre
-- =============================================

-- 1. Períodos fiscales
CREATE TABLE IF NOT EXISTS fiscal_periods (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    period      TEXT          NOT NULL,  -- YYYY-MM
    status      TEXT          NOT NULL DEFAULT 'OPEN'
                              CHECK (status IN ('OPEN','CLOSING','CLOSED')),
    closed_by   UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
    closed_at   TIMESTAMPTZ,
    notes       TEXT,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, period)
);

-- 2. Items del checklist de cierre
CREATE TABLE IF NOT EXISTS period_close_items (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    period_id     UUID          NOT NULL REFERENCES fiscal_periods(id) ON DELETE CASCADE,
    item_key      TEXT          NOT NULL,
    is_confirmed  BOOLEAN       NOT NULL DEFAULT false,
    confirmed_at  TIMESTAMPTZ,
    confirmed_by  UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE (period_id, item_key)
);

-- RLS
ALTER TABLE fiscal_periods      ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_close_items  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fiscal_periods' AND policyname='fiscal_periods_tenant') THEN
        CREATE POLICY "fiscal_periods_tenant" ON fiscal_periods FOR ALL
            USING (tenant_id = get_my_tenant_id())
            WITH CHECK (tenant_id = get_my_tenant_id());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='period_close_items' AND policyname='period_close_items_tenant') THEN
        CREATE POLICY "period_close_items_tenant" ON period_close_items FOR ALL
            USING (tenant_id = get_my_tenant_id())
            WITH CHECK (tenant_id = get_my_tenant_id());
    END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_tenant  ON fiscal_periods(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_period_close_items_period ON period_close_items(period_id, item_key);
