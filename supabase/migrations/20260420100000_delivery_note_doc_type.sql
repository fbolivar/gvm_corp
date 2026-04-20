-- ============================================================
-- Remisiones (Delivery notes / Hojas de envío)
-- Agrega tipo DELIVERY_NOTE al enum document_type para permitir
-- el flujo: SALES_ORDER → DELIVERY_NOTE → INVOICE
-- ============================================================

-- 1) Agregar valor al enum (ALTER TYPE ADD VALUE)
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'DELIVERY_NOTE';

-- 2) RPC: obtener siguiente número de remisión (REM-00001, REM-00002...)
--    Usado desde el server action al convertir pedido → remisión.
CREATE OR REPLACE FUNCTION next_delivery_note_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max INT;
  v_next TEXT;
BEGIN
  -- Buscar el mayor correlativo de remisiones del tenant
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(number FROM 'REM-(\d+)') AS INT)
  ), 0)
  INTO v_max
  FROM documents
  WHERE tenant_id = p_tenant_id
    AND doc_type = 'DELIVERY_NOTE'
    AND number ~ '^REM-\d+$';

  v_next := 'REM-' || LPAD((v_max + 1)::TEXT, 5, '0');
  RETURN v_next;
END;
$$;

COMMENT ON FUNCTION next_delivery_note_number(UUID) IS
'Genera el siguiente número secuencial de remisión (REM-00001) para el tenant.';
