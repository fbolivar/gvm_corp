-- =============================================
-- MÓDULO: Facturación Recurrente
-- Fecha: 2026-03-03
-- Descripción: Plantillas de facturas con programación automática
-- =============================================

CREATE TABLE IF NOT EXISTS recurring_invoices (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT          NOT NULL DEFAULT 'Facturación recurrente',
    party_id        UUID          REFERENCES parties(id) ON DELETE SET NULL,
    frequency       TEXT          NOT NULL DEFAULT 'MONTHLY'
                                  CHECK (frequency IN ('WEEKLY','BIWEEKLY','MONTHLY','QUARTERLY','ANNUALLY')),
    next_run_date   DATE          NOT NULL,
    last_run_date   DATE,
    status          TEXT          NOT NULL DEFAULT 'ACTIVE'
                                  CHECK (status IN ('ACTIVE','PAUSED','CANCELLED')),
    lines           JSONB         NOT NULL DEFAULT '[]',
    currency        TEXT          NOT NULL DEFAULT 'COP',
    notes_public    TEXT,
    created_by      UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'recurring_invoices' AND policyname = 'recurring_invoices_tenant'
    ) THEN
        CREATE POLICY "recurring_invoices_tenant"
            ON recurring_invoices FOR ALL
            USING (tenant_id = get_my_tenant_id())
            WITH CHECK (tenant_id = get_my_tenant_id());
    END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_tenant   ON recurring_invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_run ON recurring_invoices(next_run_date) WHERE status = 'ACTIVE';
