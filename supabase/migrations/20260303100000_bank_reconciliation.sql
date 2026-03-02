-- =============================================
-- MÓDULO: Conciliación Bancaria
-- Fecha: 2026-03-03
-- Descripción: Tablas bank_statements y bank_statement_lines
-- =============================================

-- 1. Cabecera del extracto bancario
CREATE TABLE IF NOT EXISTS bank_statements (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_id       UUID          NOT NULL REFERENCES treasury_accounts(id) ON DELETE CASCADE,
    start_date       DATE          NOT NULL,
    end_date         DATE          NOT NULL,
    opening_balance  NUMERIC(15,2) NOT NULL DEFAULT 0,
    closing_balance  NUMERIC(15,2) NOT NULL DEFAULT 0,
    status           TEXT          NOT NULL DEFAULT 'DRAFT'
                                   CHECK (status IN ('DRAFT','COMPLETED')),
    created_by       UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 2. Líneas del extracto
CREATE TABLE IF NOT EXISTS bank_statement_lines (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_id    UUID          NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
    tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    date            DATE          NOT NULL,
    description     TEXT          NOT NULL DEFAULT '',
    amount          NUMERIC(15,2) NOT NULL,
    transaction_id  UUID          REFERENCES treasury_transactions(id) ON DELETE SET NULL,
    status          TEXT          NOT NULL DEFAULT 'UNMATCHED'
                                  CHECK (status IN ('UNMATCHED','MATCHED','EXCLUDED')),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 3. RLS
ALTER TABLE bank_statements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_statement_lines ENABLE ROW LEVEL SECURITY;

-- bank_statements: solo su tenant
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bank_statements' AND policyname='bank_statements_tenant') THEN
        CREATE POLICY "bank_statements_tenant"
            ON bank_statements FOR ALL
            USING (tenant_id = get_my_tenant_id())
            WITH CHECK (tenant_id = get_my_tenant_id());
    END IF;
END $$;

-- bank_statement_lines: solo su tenant
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bank_statement_lines' AND policyname='bank_statement_lines_tenant') THEN
        CREATE POLICY "bank_statement_lines_tenant"
            ON bank_statement_lines FOR ALL
            USING (tenant_id = get_my_tenant_id())
            WITH CHECK (tenant_id = get_my_tenant_id());
    END IF;
END $$;

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_bank_statements_account   ON bank_statements(account_id, status);
CREATE INDEX IF NOT EXISTS idx_bank_statements_tenant    ON bank_statements(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bsl_statement             ON bank_statement_lines(statement_id, status);
CREATE INDEX IF NOT EXISTS idx_bsl_transaction           ON bank_statement_lines(transaction_id);
