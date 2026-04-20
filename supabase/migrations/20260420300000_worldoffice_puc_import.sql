-- ============================================================
-- WorldOffice PUC import — chart_accounts fields + RPC masiva
-- ============================================================

-- Campos adicionales de WO
ALTER TABLE chart_accounts
  ADD COLUMN IF NOT EXISTS parent_code TEXT,
  ADD COLUMN IF NOT EXISTS requires_party BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS group_label TEXT,
  ADD COLUMN IF NOT EXISTS class_code TEXT,
  ADD COLUMN IF NOT EXISTS external_ref TEXT,
  ADD COLUMN IF NOT EXISTS source_system TEXT;

CREATE INDEX IF NOT EXISTS idx_chart_accounts_tenant_code ON chart_accounts(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_chart_accounts_tenant_parent_code ON chart_accounts(tenant_id, parent_code);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chart_accounts_tenant_code_unique'
  ) THEN
    ALTER TABLE chart_accounts
      ADD CONSTRAINT chart_accounts_tenant_code_unique UNIQUE (tenant_id, code);
  END IF;
END $$;

-- Helpers
CREATE OR REPLACE FUNCTION _puc_level_from_code(p_code TEXT) RETURNS INT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE length(trim(p_code))
    WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 4 THEN 3 WHEN 6 THEN 4 ELSE 5
  END
$$;

CREATE OR REPLACE FUNCTION _puc_nature_from_class(p_class TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE p_class
    WHEN '1' THEN 'DEBIT' WHEN '2' THEN 'CREDIT' WHEN '3' THEN 'CREDIT'
    WHEN '4' THEN 'CREDIT' WHEN '5' THEN 'DEBIT' WHEN '6' THEN 'DEBIT'
    WHEN '7' THEN 'DEBIT' WHEN '8' THEN 'DEBIT' WHEN '9' THEN 'CREDIT'
    ELSE NULL
  END
$$;

-- Import masivo con 2 pasadas (insert + link parent)
CREATE OR REPLACE FUNCTION import_chart_accounts_wo(
  p_tenant_id UUID,
  p_rows JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row JSONB;
  v_code TEXT;
  v_inserted INT := 0;
  v_linked INT := 0;
  v_total INT;
BEGIN
  IF p_tenant_id IS NULL THEN RAISE EXCEPTION 'tenant_id requerido'; END IF;
  v_total := jsonb_array_length(p_rows);

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_code := trim(v_row->>'code');
    IF v_code IS NULL OR v_code = '' THEN CONTINUE; END IF;

    INSERT INTO chart_accounts (
      tenant_id, code, name, parent_code,
      is_auxiliary, is_active, is_visible,
      requires_party, group_label, type,
      level, class_code, nature, external_ref, source_system
    ) VALUES (
      p_tenant_id, v_code, COALESCE(v_row->>'name', v_code),
      NULLIF(trim(v_row->>'parent_code'), ''),
      (length(v_code) >= 8),
      NOT COALESCE((v_row->>'inac')::BOOLEAN, false),
      NOT COALESCE((v_row->>'hidden')::BOOLEAN, false),
      COALESCE((v_row->>'requires_party')::BOOLEAN, false),
      NULLIF(trim(v_row->>'group_label'), ''),
      NULLIF(trim(v_row->>'type'), ''),
      _puc_level_from_code(v_code),
      substring(v_code FROM 1 FOR 1),
      _puc_nature_from_class(substring(v_code FROM 1 FOR 1)),
      NULLIF(trim(v_row->>'external_ref'), ''),
      'WORLDOFFICE'
    )
    ON CONFLICT (tenant_id, code) DO UPDATE SET
      name = EXCLUDED.name,
      parent_code = EXCLUDED.parent_code,
      is_auxiliary = EXCLUDED.is_auxiliary,
      is_active = EXCLUDED.is_active,
      is_visible = EXCLUDED.is_visible,
      requires_party = EXCLUDED.requires_party,
      group_label = EXCLUDED.group_label,
      type = EXCLUDED.type,
      level = EXCLUDED.level,
      class_code = EXCLUDED.class_code,
      nature = EXCLUDED.nature,
      external_ref = EXCLUDED.external_ref,
      source_system = EXCLUDED.source_system,
      updated_at = now();
    v_inserted := v_inserted + 1;
  END LOOP;

  -- Pasada 2: resolver parent_id
  WITH parents AS (
    SELECT c.id AS child_id, p.id AS parent_id
    FROM chart_accounts c
    JOIN chart_accounts p ON p.tenant_id = c.tenant_id AND p.code = c.parent_code
    WHERE c.tenant_id = p_tenant_id
      AND c.parent_code IS NOT NULL
      AND (c.parent_id IS NULL OR c.parent_id != p.id)
  )
  UPDATE chart_accounts ca
     SET parent_id = p.parent_id, updated_at = now()
    FROM parents p
   WHERE ca.id = p.child_id;
  GET DIAGNOSTICS v_linked = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'total_rows', v_total,
    'processed', v_inserted,
    'linked_parents', v_linked
  );
END;
$$;

GRANT EXECUTE ON FUNCTION import_chart_accounts_wo(UUID, JSONB) TO authenticated;
