-- Búsqueda de productos también por CÓDIGO DE BARRAS (barcode), además de nombre y SKU.
-- Antes: get_products_with_stock solo filtraba por name y sku.
CREATE OR REPLACE FUNCTION public.get_products_with_stock(p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_search text DEFAULT ''::text)
 RETURNS TABLE(id uuid, tenant_id uuid, name text, sku text, type text, uom text, cost numeric, selling_price numeric, tax_category text, status text, min_stock numeric, barcode text, description text, created_at timestamp with time zone, updated_at timestamp with time zone, total_qty numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    SELECT
        p.id,
        p.tenant_id,
        p.name,
        p.sku,
        p.type,
        p.uom,
        p.cost,
        p.selling_price,
        p.tax_category,
        p.status,
        p.min_stock,
        p.barcode,
        p.description,
        p.created_at,
        p.updated_at,
        COALESCE(SUM(ps.qty), 0) AS total_qty
    FROM products p
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    WHERE
        (p_search = ''
         OR p.name ILIKE '%' || p_search || '%'
         OR p.sku ILIKE '%' || p_search || '%'
         OR p.barcode ILIKE '%' || p_search || '%')
    GROUP BY p.id
    ORDER BY p.name
    LIMIT p_limit
    OFFSET p_offset;
$function$;
