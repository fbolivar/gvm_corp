-- ============================================================
-- Petty Cash (Cajas Menores) Module
-- Migration: 20260316950000_petty_cash.sql
-- ============================================================

-- ── 1. Funds table ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS petty_cash_funds (
    id                  UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id           UUID         NOT NULL REFERENCES tenants(id),
    name                TEXT         NOT NULL,
    custodian_id        UUID         REFERENCES auth.users(id),
    treasury_account_id UUID         REFERENCES treasury_accounts(id),
    max_amount          NUMERIC(15,2) NOT NULL DEFAULT 500000,
    current_balance     NUMERIC(15,2) NOT NULL DEFAULT 0,
    status              TEXT         NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED')),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ           DEFAULT now()
);

-- ── 2. Transactions table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS petty_cash_transactions (
    id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id        UUID         NOT NULL REFERENCES tenants(id),
    fund_id          UUID         NOT NULL REFERENCES petty_cash_funds(id) ON DELETE CASCADE,
    type             TEXT         NOT NULL
                         CHECK (type IN ('REIMBURSEMENT', 'EXPENSE', 'OPENING')),
    amount           NUMERIC(15,2) NOT NULL,
    description      TEXT         NOT NULL,
    receipt_number   TEXT,
    expense_category TEXT,
    created_by       UUID         REFERENCES auth.users(id),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── 3. Index ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_petty_cash_txn_fund
    ON petty_cash_transactions(fund_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_petty_cash_funds_tenant
    ON petty_cash_funds(tenant_id, status);

-- ── 4. updated_at trigger ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_petty_cash_funds_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_petty_cash_funds_updated_at ON petty_cash_funds;
CREATE TRIGGER trg_petty_cash_funds_updated_at
    BEFORE UPDATE ON petty_cash_funds
    FOR EACH ROW EXECUTE FUNCTION update_petty_cash_funds_updated_at();

-- ── 5. Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE petty_cash_funds        ENABLE ROW LEVEL SECURITY;
ALTER TABLE petty_cash_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation funds"
    ON petty_cash_funds
    FOR ALL
    USING (tenant_id = get_my_tenant_id());

CREATE POLICY "Tenant isolation transactions"
    ON petty_cash_transactions
    FOR ALL
    USING (tenant_id = get_my_tenant_id());

-- ── 6. Grants ─────────────────────────────────────────────────────────────────

GRANT ALL ON petty_cash_funds        TO authenticated;
GRANT ALL ON petty_cash_transactions TO authenticated;
