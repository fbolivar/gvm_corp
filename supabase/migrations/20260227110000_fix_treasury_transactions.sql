-- Fix treasury_transactions: add missing columns that the code expects
-- Real columns in DB: id, tenant_id, account_id, party_id, amount, created_at
-- Missing: transaction_type, date, description, reference_number, is_reconciled, reconciled_at, accounting_entry_id

ALTER TABLE treasury_transactions
    ADD COLUMN IF NOT EXISTS transaction_type TEXT NOT NULL DEFAULT 'PAYMENT'
        CHECK (transaction_type IN ('RECEIPT', 'PAYMENT', 'TRANSFER')),
    ADD COLUMN IF NOT EXISTS date DATE NOT NULL DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS reference_number TEXT,
    ADD COLUMN IF NOT EXISTS is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS accounting_entry_id UUID; -- FK to accounting_entries (table may not exist yet)

-- Index for common query patterns
CREATE INDEX IF NOT EXISTS idx_treasury_tx_date ON treasury_transactions(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_treasury_tx_type ON treasury_transactions(tenant_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_treasury_tx_reconciled ON treasury_transactions(tenant_id, is_reconciled);
