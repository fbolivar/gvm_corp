-- ============================================================
-- WorldOffice — Import masivo de terceros (upsert no-destructivo)
-- ============================================================

-- 1. Agregar PEP al enum doc_id_type (Permiso Especial de Permanencia)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'doc_id_type' AND e.enumlabel = 'PEP'
  ) THEN
    ALTER TYPE doc_id_type ADD VALUE 'PEP';
  END IF;
END $$;

-- 2. RPC import_parties_wo — upsert no-destructivo por (tenant_id, doc_number)
--    Estrategia:
--    - Si el tercero YA existe (migrado de Dolibarr): solo completa campos null/vacíos
--    - Si es nuevo: lo crea con defaults (is_customer=true, is_vendor=false)
--    - Siempre registra trazabilidad en party_external_ids

CREATE OR REPLACE FUNCTION import_parties_wo(
  p_tenant_id UUID,
  p_rows JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row JSONB;
  v_doc_number TEXT;
  v_doc_type TEXT;
  v_party_type TEXT;
  v_existing_id UUID;
  v_new_id UUID;
  v_inserted INT := 0;
  v_updated INT := 0;
  v_skipped INT := 0;
  v_total INT;
BEGIN
  IF p_tenant_id IS NULL THEN RAISE EXCEPTION 'tenant_id requerido'; END IF;
  v_total := jsonb_array_length(p_rows);

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_doc_number := trim(v_row->>'doc_number');
    v_doc_type := UPPER(COALESCE(trim(v_row->>'doc_type'), 'NIT'));

    IF v_doc_number IS NULL OR v_doc_number = '' THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    IF v_doc_type NOT IN ('NIT', 'CC', 'CE', 'PP', 'TI', 'PEP') THEN
      v_doc_type := 'PP';
    END IF;

    v_party_type := CASE WHEN v_doc_type = 'NIT' THEN 'COMPANY' ELSE 'PERSON' END;

    SELECT id INTO v_existing_id
    FROM parties
    WHERE tenant_id = p_tenant_id AND doc_number = v_doc_number
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      UPDATE parties SET
        legal_name = CASE
          WHEN legal_name IS NULL OR trim(legal_name) = '' OR legal_name = doc_number
          THEN COALESCE(NULLIF(trim(v_row->>'legal_name'), ''), legal_name)
          ELSE legal_name
        END,
        dv = CASE
          WHEN dv IS NULL OR trim(dv) = ''
          THEN NULLIF(trim(v_row->>'dv'), '')
          ELSE dv
        END,
        address = CASE
          WHEN address IS NULL OR trim(address) = '' OR lower(address) = 'no informada'
          THEN NULLIF(trim(v_row->>'address'), '')
          ELSE address
        END,
        phone = CASE
          WHEN phone IS NULL OR trim(phone) = '' OR phone = '0'
          THEN NULLIF(trim(v_row->>'phone'), '')
          ELSE phone
        END,
        city = CASE
          WHEN city IS NULL OR trim(city) = ''
          THEN NULLIF(trim(v_row->>'city'), '')
          ELSE city
        END,
        updated_at = now()
      WHERE id = v_existing_id;

      INSERT INTO party_external_ids (tenant_id, party_id, source_system, source_table, source_id)
      VALUES (p_tenant_id, v_existing_id, 'WORLDOFFICE', 'Terceros', v_doc_number)
      ON CONFLICT DO NOTHING;

      v_updated := v_updated + 1;
    ELSE
      INSERT INTO parties (
        tenant_id, party_type, legal_name, doc_type, doc_number,
        dv, address, phone, city, is_customer, is_vendor
      ) VALUES (
        p_tenant_id,
        v_party_type::party_type,
        COALESCE(NULLIF(trim(v_row->>'legal_name'), ''), v_doc_number),
        v_doc_type::doc_id_type,
        v_doc_number,
        NULLIF(trim(v_row->>'dv'), ''),
        NULLIF(trim(v_row->>'address'), ''),
        NULLIF(trim(v_row->>'phone'), ''),
        NULLIF(trim(v_row->>'city'), ''),
        true,
        false
      )
      RETURNING id INTO v_new_id;

      INSERT INTO party_external_ids (tenant_id, party_id, source_system, source_table, source_id)
      VALUES (p_tenant_id, v_new_id, 'WORLDOFFICE', 'Terceros', v_doc_number)
      ON CONFLICT DO NOTHING;

      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_rows', v_total,
    'inserted', v_inserted,
    'updated', v_updated,
    'skipped', v_skipped
  );
END;
$$;

GRANT EXECUTE ON FUNCTION import_parties_wo(UUID, JSONB) TO authenticated;
