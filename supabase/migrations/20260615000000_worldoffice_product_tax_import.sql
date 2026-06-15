-- RPC: actualiza tax_category de products por código (SKU) desde el
-- Listado de Inventarios de WorldOffice. No destructivo: solo toca tax_category.
CREATE OR REPLACE FUNCTION update_product_tax_wo(p_tenant_id uuid, p_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row JSONB;
  v_code TEXT;
  v_tax TEXT;
  v_updated INT := 0;
  v_unmatched INT := 0;
  v_d0 INT := 0;
  v_d5 INT := 0;
  v_d19 INT := 0;
  v_n INT;
BEGIN
  IF p_tenant_id IS NULL THEN RAISE EXCEPTION 'tenant_id requerido'; END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_code := UPPER(TRIM(v_row->>'code'));
    v_tax := v_row->>'tax_category';
    IF v_code = '' OR v_tax NOT IN ('IVA_0','IVA_5','IVA_19') THEN CONTINUE; END IF;

    UPDATE products SET tax_category = v_tax
    WHERE tenant_id = p_tenant_id AND UPPER(sku) = v_code;
    GET DIAGNOSTICS v_n = ROW_COUNT;

    IF v_n > 0 THEN
      v_updated := v_updated + v_n;
      IF v_tax = 'IVA_0' THEN v_d0 := v_d0 + v_n;
      ELSIF v_tax = 'IVA_5' THEN v_d5 := v_d5 + v_n;
      ELSE v_d19 := v_d19 + v_n;
      END IF;
    ELSE
      v_unmatched := v_unmatched + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'updated', v_updated,
    'unmatched', v_unmatched,
    'd0', v_d0,
    'd5', v_d5,
    'd19', v_d19
  );
END;
$function$;
