CREATE TABLE IF NOT EXISTS currencies (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL DEFAULT '$',
    decimal_places INT DEFAULT 2
);
INSERT INTO currencies (code, name, symbol, decimal_places) VALUES
    ('COP', 'Peso Colombiano', '$', 0),
    ('USD', 'Dólar Estadounidense', 'US$', 2),
    ('EUR', 'Euro', '€', 2)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    from_currency TEXT NOT NULL REFERENCES currencies(code),
    to_currency TEXT NOT NULL REFERENCES currencies(code),
    rate NUMERIC(12,6) NOT NULL,
    effective_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, from_currency, to_currency, effective_date)
);
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation" ON exchange_rates FOR ALL USING (tenant_id = get_my_tenant_id());
GRANT ALL ON exchange_rates TO authenticated;

ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'COP';
ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(12,6) DEFAULT 1;
ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS amount_foreign NUMERIC(15,2);
