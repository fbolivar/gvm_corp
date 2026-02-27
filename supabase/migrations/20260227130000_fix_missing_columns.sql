-- Comprehensive fix: add missing columns to several tables
-- Identified via OpenAPI schema comparison vs code expectations

-- 1. treasury_accounts: missing type, bank_name, account_number, chart_account_id
ALTER TABLE treasury_accounts
    ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'BANK'
        CHECK (type IN ('BANK', 'CASH', 'CREDIT', 'INVESTMENT', 'OTHER')),
    ADD COLUMN IF NOT EXISTS bank_name TEXT,
    ADD COLUMN IF NOT EXISTS account_number TEXT,
    ADD COLUMN IF NOT EXISTS chart_account_id UUID,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. journal_entries: need to verify period is TEXT (used as string in code)
-- Already has: id, tenant_id, entry_date, description, number, period, status, created_at — OK

-- 3. chart_accounts: missing level, parent_id (used in accounting service)
ALTER TABLE chart_accounts
    ADD COLUMN IF NOT EXISTS level INTEGER,
    ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES chart_accounts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS balance NUMERIC(18,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS type TEXT,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 4. products: missing description, selling_price, tax_category
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS selling_price NUMERIC(18,2),
    ADD COLUMN IF NOT EXISTS tax_category TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 5. parties: missing address, city, country (used in some reports)
ALTER TABLE parties
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS department TEXT,
    ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'CO',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_treasury_accounts_tenant ON treasury_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chart_accounts_parent ON chart_accounts(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chart_accounts_code ON chart_accounts(tenant_id, code);
