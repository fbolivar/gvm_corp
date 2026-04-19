-- ============================================================
-- RPC: consume_stock_for_document
-- Al emitir factura (doc con líneas con warehouse_id), descuenta stock
-- aplicando FEFO: consume del lote que vence primero, splits si necesario.
-- Si falta stock en alguna línea, lanza excepción (rollback transaccional).
-- ============================================================

CREATE OR REPLACE FUNCTION consume_stock_for_document(p_doc_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_doc_type TEXT;
  v_line RECORD;
  v_lot RECORD;
  v_needed NUMERIC;
  v_take NUMERIC;
  v_available NUMERIC;
  v_movements_created INT := 0;
  v_lines_processed INT := 0;
  v_errors JSONB := '[]'::JSONB;
BEGIN
  -- Validar documento
  SELECT tenant_id, doc_type INTO v_tenant_id, v_doc_type
  FROM documents WHERE id = p_doc_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Documento no encontrado: %', p_doc_id;
  END IF;

  -- Pre-validar todas las líneas: stock disponible por bodega
  FOR v_line IN
    SELECT id, product_id, warehouse_id, qty, description
    FROM document_lines
    WHERE document_id = p_doc_id
      AND product_id IS NOT NULL
      AND qty > 0
  LOOP
    IF v_line.warehouse_id IS NULL THEN
      v_errors := v_errors || jsonb_build_object(
        'line_id', v_line.id,
        'error', 'Línea sin bodega asignada: ' || COALESCE(v_line.description, '(sin descripción)')
      );
      CONTINUE;
    END IF;

    SELECT COALESCE(qty, 0) INTO v_available
    FROM product_stock
    WHERE product_id = v_line.product_id AND warehouse_id = v_line.warehouse_id;

    IF v_available IS NULL OR v_available < v_line.qty THEN
      v_errors := v_errors || jsonb_build_object(
        'line_id', v_line.id,
        'error', format('Stock insuficiente: disponible %s, requerido %s',
                        COALESCE(v_available, 0), v_line.qty)
      );
    END IF;
  END LOOP;

  IF jsonb_array_length(v_errors) > 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: %', v_errors::text;
  END IF;

  -- Ejecutar consumos (transaccional: cualquier error revierte todo)
  FOR v_line IN
    SELECT id, product_id, warehouse_id, qty
    FROM document_lines
    WHERE document_id = p_doc_id
      AND product_id IS NOT NULL
      AND warehouse_id IS NOT NULL
      AND qty > 0
  LOOP
    v_needed := v_line.qty;
    v_lines_processed := v_lines_processed + 1;

    -- FEFO: iterar lotes ACTIVE ordenados por fecha vencimiento
    FOR v_lot IN
      SELECT id, qty AS lot_qty, expiration_date
      FROM product_lots
      WHERE product_id = v_line.product_id
        AND warehouse_id = v_line.warehouse_id
        AND status = 'ACTIVE'
        AND qty > 0
      ORDER BY expiration_date ASC, id ASC
    LOOP
      EXIT WHEN v_needed <= 0;

      v_take := LEAST(v_lot.lot_qty, v_needed);

      -- Insertar movement con lot_id (trigger trg_adjust_lot_on_movement ajusta product_lots.qty)
      INSERT INTO inventory_movements (
        tenant_id, product_id, warehouse_id, lot_id,
        type, qty, cost, ref_doc_type, ref_doc_id, occurred_at
      ) VALUES (
        v_tenant_id, v_line.product_id, v_line.warehouse_id, v_lot.id,
        'OUT', v_take, 0, 'INVOICE', p_doc_id, now()
      );

      v_needed := v_needed - v_take;
      v_movements_created := v_movements_created + 1;
    END LOOP;

    -- Si aún queda qty por descontar (no había lotes o no suficientes), movement sin lot
    IF v_needed > 0 THEN
      INSERT INTO inventory_movements (
        tenant_id, product_id, warehouse_id,
        type, qty, cost, ref_doc_type, ref_doc_id, occurred_at
      ) VALUES (
        v_tenant_id, v_line.product_id, v_line.warehouse_id,
        'OUT', v_needed, 0, 'INVOICE', p_doc_id, now()
      );
      v_movements_created := v_movements_created + 1;
    END IF;

    -- product_stock es VIEW agregada sobre inventory_movements: se recalcula sola
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'lines_processed', v_lines_processed,
    'movements_created', v_movements_created
  );
END;
$$;

COMMENT ON FUNCTION consume_stock_for_document(UUID) IS
'Consume stock FEFO para un documento (factura). Transaccional: si falta stock, rollback.';
