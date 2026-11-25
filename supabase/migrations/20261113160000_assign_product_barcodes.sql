-- Etiquetas QR por producto: asigna un código estable a los productos ACTIVOS que
-- NO tienen código de barras/QR de fábrica, para poder imprimirlo y pegarlo. El código
-- se guarda en products.barcode (texto) para que el escáner lo reconozca por igualdad
-- exacta (BarcodeScanner busca `barcode == <texto escaneado>`).
--
-- Formato del código (nivel producto, estable): "<NIT> <SKU> <UNIDAD>"
--   ej. "901159331 AGNEP-004 25 Kg"
-- Es único porque el SKU es único por tenant. Lote/fechas NO se incluyen (no están en
-- el producto y el sticker es permanente); se eligen al escanear si el producto maneja lote.

CREATE OR REPLACE FUNCTION assign_missing_product_barcodes(p_prefix text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant uuid := get_my_tenant_id();
    v_prefix text := btrim(coalesce(p_prefix, ''));
    v_count int;
BEGIN
    IF v_tenant IS NULL THEN RAISE EXCEPTION 'Sin empresa asignada'; END IF;
    IF v_prefix = '' THEN RAISE EXCEPTION 'Prefijo (NIT) requerido'; END IF;

    -- Permiso (defensa en profundidad; la Server Action también lo valida): rol de alto
    -- nivel o can_edit en el módulo de inventario.
    IF NOT (
        coalesce((SELECT ut.role FROM user_tenants ut WHERE ut.user_id = auth.uid() AND ut.tenant_id = v_tenant), '')
            IN ('SUPER ADMINISTRADOR', 'ADMINISTRADOR', 'owner', 'admin')
        OR EXISTS (
            SELECT 1 FROM user_tenants ut
            JOIN role_permissions rp ON rp.role_id = ut.role_id
            WHERE ut.user_id = auth.uid() AND ut.tenant_id = v_tenant
              AND rp.module_key = 'inventory' AND rp.can_edit = true
        )
    ) THEN
        RAISE EXCEPTION 'Sin permiso para generar códigos de inventario';
    END IF;

    UPDATE products p
    SET barcode = v_prefix || ' ' || btrim(p.sku)
            || CASE WHEN coalesce(nullif(btrim(p.uom), ''), '') <> '' THEN ' ' || btrim(p.uom) ELSE '' END,
        updated_at = now()
    WHERE p.tenant_id = v_tenant
      AND p.status = 'ACTIVE'
      AND (p.barcode IS NULL OR btrim(p.barcode) = '')
      AND p.sku IS NOT NULL AND btrim(p.sku) <> '';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION assign_missing_product_barcodes(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION assign_missing_product_barcodes(text) TO authenticated;
