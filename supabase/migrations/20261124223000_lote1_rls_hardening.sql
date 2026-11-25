
-- ============================================================================
-- LOTE 1 — Correcciones críticas de RLS/permisos (auditoría 2026-11-24)
-- ============================================================================

-- 1a) profiles: impedir que un usuario autenticado se auto-promueva a is_platform_admin.
--     Ningún flujo de la app cambia esta columna con sesión (solo lecturas); la
--     escritura legítima es por service role / migración. El trigger bloquea el
--     cambio SOLO cuando viene como authenticated/anon por PostgREST.
CREATE OR REPLACE FUNCTION public.guard_profiles_platform_admin()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
BEGIN
    IF (NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin) THEN
        IF COALESCE(current_setting('request.jwt.claims', true)::json ->> 'role', '') IN ('authenticated','anon') THEN
            RAISE EXCEPTION 'No autorizado para modificar is_platform_admin';
        END IF;
    END IF;
    RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_guard_profiles_platform_admin ON public.profiles;
CREATE TRIGGER trg_guard_profiles_platform_admin
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_platform_admin();

-- 1b) Cerrar fugas cross-tenant: quitar la política "cualquier autenticado" y dejar
--     solo el filtro por tenant (vía el ticket padre, que sí tiene tenant_id).
DROP POLICY IF EXISTS chat_members_auth ON public.chat_channel_members;
-- (chat_channel_members conserva sus 4 políticas por-canal/tenant ya existentes.)

DROP POLICY IF EXISTS support_interactions_auth ON public.support_interactions;
CREATE POLICY support_interactions_tenant ON public.support_interactions
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.tenant_id = public.get_my_tenant_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.tenant_id = public.get_my_tenant_id()));

DROP POLICY IF EXISTS support_audit_log_auth ON public.support_audit_log;
CREATE POLICY support_audit_log_tenant ON public.support_audit_log
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.tenant_id = public.get_my_tenant_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.tenant_id = public.get_my_tenant_id()));

-- 1c) tenant_licenses: solo lectura para usuarios. La escritura de licencias es
--     exclusiva del super-admin de plataforma (service role, que ignora estos grants).
REVOKE INSERT, UPDATE, DELETE ON public.tenant_licenses FROM authenticated, anon;
