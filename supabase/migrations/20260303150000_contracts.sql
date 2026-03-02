-- ============================================================
-- CONTRATOS: gestión de contratos con terceros
-- ============================================================

CREATE TABLE IF NOT EXISTS contracts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    contract_number TEXT,
    contract_type   TEXT NOT NULL DEFAULT 'SERVICE'
                        CHECK (contract_type IN ('SERVICE','PURCHASE','LEASE','EMPLOYMENT','CONSULTING','OTHER')),
    status          TEXT NOT NULL DEFAULT 'DRAFT'
                        CHECK (status IN ('DRAFT','ACTIVE','EXPIRED','TERMINATED','SUSPENDED')),
    party_id        UUID REFERENCES parties(id) ON DELETE SET NULL,
    start_date      DATE NOT NULL,
    end_date        DATE,
    auto_renew      BOOLEAN NOT NULL DEFAULT FALSE,
    value           NUMERIC(18,2) NOT NULL DEFAULT 0,
    currency        CHAR(3) NOT NULL DEFAULT 'COP',
    signed_by       TEXT,
    signed_at       DATE,
    description     TEXT,
    notes           TEXT,
    created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Amendments / Otrosí ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contract_amendments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id      UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    amendment_number INT NOT NULL,
    description      TEXT NOT NULL,
    effective_date   DATE NOT NULL,
    value_change     NUMERIC(18,2) DEFAULT 0,
    created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS contracts_tenant_id_idx ON contracts(tenant_id);
CREATE INDEX IF NOT EXISTS contracts_party_id_idx  ON contracts(party_id);
CREATE INDEX IF NOT EXISTS contracts_status_idx    ON contracts(status);
CREATE INDEX IF NOT EXISTS contracts_end_date_idx  ON contracts(end_date);
CREATE INDEX IF NOT EXISTS contract_amendments_contract_id_idx ON contract_amendments(contract_id);

-- ─── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_contracts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS contracts_updated_at_trigger ON contracts;
CREATE TRIGGER contracts_updated_at_trigger
BEFORE UPDATE ON contracts
FOR EACH ROW EXECUTE FUNCTION set_contracts_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE contracts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_contracts" ON contracts
    USING (tenant_id = get_my_tenant_id());

CREATE POLICY "tenant_contract_amendments" ON contract_amendments
    USING (contract_id IN (
        SELECT id FROM contracts WHERE tenant_id = get_my_tenant_id()
    ));
