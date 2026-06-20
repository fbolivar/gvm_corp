-- ============================================================
-- Optimización de rendimiento (RLS + índices). Solo cambia el "cómo" se
-- evalúan las políticas y agrega índices; NO cambia QUIÉN puede ver qué.
--
-- Efecto: las funciones de permiso (get_my_tenant_id, auth.uid, etc.) pasan a
-- evaluarse UNA vez por consulta (InitPlan) en lugar de una vez por fila, y
-- todas las llaves foráneas quedan indexadas. Acelera la carga de los módulos.
-- ============================================================

-- 1) Eliminar políticas permisivas DUPLICADAS (misma lógica bajo dos nombres).
--    Se conserva una equivalente en cada caso. overtime_requests NO se toca
--    (admin vs empleado son intencionalmente distintas).
DROP POLICY IF EXISTS "app_roles_read_all" ON public.app_roles;
DROP POLICY IF EXISTS "crm_opportunities_tenant" ON public.crm_opportunities;
DROP POLICY IF EXISTS "leads_tenant" ON public.leads;
DROP POLICY IF EXISTS "carrier_tenant_isolation" ON public.logistics_carriers;
DROP POLICY IF EXISTS "logistics_shipment_items_auth" ON public.logistics_shipment_items;
DROP POLICY IF EXISTS "shipment_tenant_isolation" ON public.logistics_shipments;
DROP POLICY IF EXISTS "Tenant Isolation" ON public.parties;

-- 2) Envolver funciones de permiso en (select ...) → InitPlan. Comportamiento idéntico.
DO $do$
DECLARE
  r record;
  v_qual text;
  v_check text;
  v_stmt text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND ( qual ~* 'get_my_tenant_id\(\)|auth\.uid\(\)|is_system_admin\(\)|auth\.role\(\)'
         OR with_check ~* 'get_my_tenant_id\(\)|auth\.uid\(\)|is_system_admin\(\)|auth\.role\(\)' )
  LOOP
    v_qual := r.qual;
    v_check := r.with_check;

    IF v_qual IS NOT NULL THEN
      v_qual := regexp_replace(v_qual, '\(\s*select\s+(get_my_tenant_id|is_system_admin|auth\.uid|auth\.role)\(\)\s*\)', '\1()', 'gi');
      v_qual := regexp_replace(v_qual, '(get_my_tenant_id|is_system_admin|auth\.uid|auth\.role)\(\)', '(select \1())', 'g');
    END IF;
    IF v_check IS NOT NULL THEN
      v_check := regexp_replace(v_check, '\(\s*select\s+(get_my_tenant_id|is_system_admin|auth\.uid|auth\.role)\(\)\s*\)', '\1()', 'gi');
      v_check := regexp_replace(v_check, '(get_my_tenant_id|is_system_admin|auth\.uid|auth\.role)\(\)', '(select \1())', 'g');
    END IF;

    v_stmt := 'ALTER POLICY ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);
    IF v_qual IS NOT NULL THEN v_stmt := v_stmt || ' USING (' || v_qual || ')'; END IF;
    IF v_check IS NOT NULL THEN v_stmt := v_stmt || ' WITH CHECK (' || v_check || ')'; END IF;

    EXECUTE v_stmt;
  END LOOP;
END
$do$;

-- 3) Crear índices para llaves foráneas SIN cobertura.
DO $do$
DECLARE
  r record;
  v_idx text;
BEGIN
  FOR r IN
    SELECT rel.relname AS tbl,
           string_agg(quote_ident(att.attname), ', ' ORDER BY u.ord) AS cols,
           'idx_' || rel.relname || '_' || string_agg(att.attname, '_' ORDER BY u.ord) AS idxname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS u(attnum, ord) ON true
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = u.attnum
    WHERE con.contype = 'f' AND nsp.nspname = 'public'
      AND NOT EXISTS (
        SELECT 1 FROM pg_index idx
        WHERE idx.indrelid = con.conrelid
          AND (string_to_array(idx.indkey::text, ' ')::int2[])[1:array_length(con.conkey, 1)] = con.conkey
      )
    GROUP BY rel.relname, con.conname, con.conkey
  LOOP
    v_idx := left(r.idxname, 63);
    EXECUTE 'CREATE INDEX IF NOT EXISTS ' || quote_ident(v_idx) || ' ON public.' || quote_ident(r.tbl) || ' (' || r.cols || ')';
  END LOOP;
END
$do$;
