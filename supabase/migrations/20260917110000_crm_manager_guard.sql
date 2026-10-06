-- "Solo gerencia asigna cartera y define metas" — ahora también en la base.
--
-- La regla vivía solo en las Server Actions (accountActions.ts). Como el
-- cliente de sesión respeta RLS y las políticas solo miraban el tenant,
-- cualquier usuario autenticado podía llamar a PostgREST directamente y
-- ponerse clientes en su cartera o bajarse la meta. Hallazgo del
-- security-reviewer (2026-09-17).
--
-- is_crm_manager() replica visitService.canSeeAllVisits: roles de gerencia
-- comercial/administración, can_admin en el módulo crm, o role admin/owner.
-- service_role (auth.uid() nulo) pasa siempre: scripts y jobs.

CREATE OR REPLACE FUNCTION public.is_crm_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NULL OR EXISTS (
    SELECT 1
    FROM user_tenants ut
    LEFT JOIN app_roles r ON r.id = ut.role_id
    LEFT JOIN role_permissions rp ON rp.role_id = ut.role_id AND rp.module_key = 'crm'
    WHERE ut.user_id = auth.uid()
      AND COALESCE(ut.status, 'active') = 'active'
      AND (
        ut.role IN ('admin', 'owner')
        OR upper(r.name) IN (
          'SUPER ADMINISTRADOR', 'ADMINISTRADOR', 'GENERAL MANAGER', 'GERENTE ADMINISTRATIVO',
          'SALES AND MARKETING MANAGER', 'ASISTENTE DE GERENCIA VENTAS', 'ASISTENTE COMERCIAL',
          'JEFE ADMINISTRATIVO'
        )
        OR COALESCE(rp.can_admin, false)
      )
  );
$$;

-- Solo la API la necesita como parte de políticas/triggers; no hace falta RPC.
REVOKE EXECUTE ON FUNCTION public.is_crm_manager() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_crm_manager() TO authenticated, service_role;

-- Metas: todos los del tenant leen (el comercial ve su meta); solo gerencia escribe.
DROP POLICY IF EXISTS crm_sales_targets_tenant ON public.crm_sales_targets;
DROP POLICY IF EXISTS crm_sales_targets_read ON public.crm_sales_targets;
DROP POLICY IF EXISTS crm_sales_targets_write ON public.crm_sales_targets;
CREATE POLICY crm_sales_targets_read ON public.crm_sales_targets
    FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY crm_sales_targets_write ON public.crm_sales_targets
    FOR ALL
    USING (tenant_id = get_my_tenant_id() AND public.is_crm_manager())
    WITH CHECK (tenant_id = get_my_tenant_id() AND public.is_crm_manager());

-- Cartera: parties tiene muchas columnas editables por todos (la ficha del
-- tercero), así que se protege SOLO el cambio de comercial con un trigger.
CREATE OR REPLACE FUNCTION public.guard_party_salesperson()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.salesperson_id IS DISTINCT FROM OLD.salesperson_id AND NOT public.is_crm_manager() THEN
        RAISE EXCEPTION 'Solo gerencia comercial puede cambiar el comercial asignado a un cliente';
    END IF;
    RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.guard_party_salesperson() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_party_salesperson ON public.parties;
CREATE TRIGGER trg_guard_party_salesperson
    BEFORE UPDATE OF salesperson_id ON public.parties
    FOR EACH ROW EXECUTE FUNCTION public.guard_party_salesperson();
