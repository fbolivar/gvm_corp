-- ============================================================
-- WorldOffice — Saldos iniciales (Balance de Prueba)
-- ============================================================

CREATE TABLE IF NOT EXISTS opening_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cutoff_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  account_id UUID REFERENCES chart_accounts(id) ON DELETE SET NULL,
  account_code TEXT NOT NULL,
  account_name TEXT,
  party_id UUID REFERENCES parties(id) ON DELETE SET NULL,
  party_doc_number TEXT,
  party_name TEXT,
  saldo_inicial NUMERIC(20, 2) NOT NULL DEFAULT 0,
  debitos NUMERIC(20, 2) NOT NULL DEFAULT 0,
  creditos NUMERIC(20, 2) NOT NULL DEFAULT 0,
  saldo_final NUMERIC(20, 2) NOT NULL DEFAULT 0,
  source_system TEXT DEFAULT 'WORLDOFFICE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opening_balances_tenant_cutoff
  ON opening_balances(tenant_id, cutoff_date DESC);
CREATE INDEX IF NOT EXISTS idx_opening_balances_account
  ON opening_balances(tenant_id, account_code);
CREATE INDEX IF NOT EXISTS idx_opening_balances_party
  ON opening_balances(tenant_id, party_doc_number);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'opening_balances_unique'
  ) THEN
    ALTER TABLE opening_balances
      ADD CONSTRAINT opening_balances_unique
      UNIQUE (tenant_id, cutoff_date, account_code, party_doc_number);
  END IF;
END $$;

ALTER TABLE opening_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS opening_balances_tenant_access ON opening_balances;
CREATE POLICY opening_balances_tenant_access ON opening_balances
  FOR ALL
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

-- RPC import masivo con upsert y resolución de account_id/party_id
CREATE OR REPLACE FUNCTION import_opening_balances_wo(
  p_tenant_id UUID,
  p_cutoff_date DATE,
  p_period_start DATE,
  p_period_end DATE,
  p_rows JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row JSONB;
  v_account_code TEXT;
  v_doc_number TEXT;
  v_account_id UUID;
  v_party_id UUID;
  v_inserted INT := 0;
  v_skipped INT := 0;
  v_total INT;
  v_total_debits NUMERIC := 0;
  v_total_credits NUMERIC := 0;
BEGIN
  IF p_tenant_id IS NULL THEN RAISE EXCEPTION 'tenant_id requerido'; END IF;
  v_total := jsonb_array_length(p_rows);

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_account_code := trim(v_row->>'account_code');
    v_doc_number := trim(v_row->>'party_doc_number');

    IF v_account_code IS NULL OR v_account_code = '' THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    SELECT id INTO v_account_id
    FROM chart_accounts
    WHERE tenant_id = p_tenant_id AND code = v_account_code
    LIMIT 1;

    v_party_id := NULL;
    IF v_doc_number IS NOT NULL AND v_doc_number <> '' THEN
      SELECT id INTO v_party_id
      FROM parties
      WHERE tenant_id = p_tenant_id AND doc_number = v_doc_number
      LIMIT 1;
    END IF;

    INSERT INTO opening_balances (
      tenant_id, cutoff_date, period_start, period_end,
      account_id, account_code, account_name,
      party_id, party_doc_number, party_name,
      saldo_inicial, debitos, creditos, saldo_final,
      source_system
    ) VALUES (
      p_tenant_id, p_cutoff_date, p_period_start, p_period_end,
      v_account_id, v_account_code, NULLIF(trim(v_row->>'account_name'), ''),
      v_party_id,
      COALESCE(v_doc_number, ''),
      NULLIF(trim(v_row->>'party_name'), ''),
      COALESCE((v_row->>'saldo_inicial')::NUMERIC, 0),
      COALESCE((v_row->>'debitos')::NUMERIC, 0),
      COALESCE((v_row->>'creditos')::NUMERIC, 0),
      COALESCE((v_row->>'saldo_final')::NUMERIC, 0),
      'WORLDOFFICE'
    )
    ON CONFLICT (tenant_id, cutoff_date, account_code, party_doc_number)
    DO UPDATE SET
      account_id = EXCLUDED.account_id,
      account_name = EXCLUDED.account_name,
      party_id = EXCLUDED.party_id,
      party_name = EXCLUDED.party_name,
      saldo_inicial = EXCLUDED.saldo_inicial,
      debitos = EXCLUDED.debitos,
      creditos = EXCLUDED.creditos,
      saldo_final = EXCLUDED.saldo_final,
      updated_at = now();

    v_inserted := v_inserted + 1;
    v_total_debits := v_total_debits + COALESCE((v_row->>'debitos')::NUMERIC, 0);
    v_total_credits := v_total_credits + COALESCE((v_row->>'creditos')::NUMERIC, 0);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_rows', v_total,
    'processed', v_inserted,
    'skipped', v_skipped,
    'total_debits', v_total_debits,
    'total_credits', v_total_credits,
    'difference', v_total_debits - v_total_credits
  );
END;
$$;

GRANT EXECUTE ON FUNCTION import_opening_balances_wo(UUID, DATE, DATE, DATE, JSONB) TO authenticated;
