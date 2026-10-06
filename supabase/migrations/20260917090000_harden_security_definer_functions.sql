-- Endurecimiento de funciones SECURITY DEFINER expuestas por PostgREST
-- (linter de Supabase 0028/0029, 2026-09-17).
--
-- Criterio: una función SECURITY DEFINER solo debe ser ejecutable desde la API
-- si (a) la app la llama con la sesión del usuario Y (b) valida por sí misma
-- quién la llama. Lo demás se cierra a service_role.
--
-- Lo que queda concedido a `authenticated` de forma INTENCIONAL (con guarda
-- interna): get_my_tenant_id, is_platform_admin, is_system_admin, can_*_payroll,
-- my_employee_id, get_my_tenant_branding, get_active_announcements,
-- dismiss_announcement, get_employee_options, get_expiring_lots, get_lot_summary,
-- get_monthly_sales, get_top_clients, get_forecast_*, perform_global_search,
-- get_logistics_dashboard_stats, get_pending_logistics_orders,
-- get_audit_user_activity, get_audit_logs_with_users, get_team_members (con la
-- guarda nueva), gestión de equipo/roles (can_manage_team), panel de plataforma
-- (is_platform_admin) e importadores WO (can_manage_team, guarda nueva).
-- Y a `anon` solo lo que necesita la pantalla de login: get_email_by_username,
-- get_tenant_by_domain, get_platform_config (datos públicos de marca).

-- 1) Funciones de TRIGGER: las dispara Postgres, nadie debe llamarlas por RPC.
--    (El privilegio EXECUTE se comprueba al crear el trigger, no al dispararse.)
REVOKE EXECUTE ON FUNCTION public.fn_audit_transfer_lines() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_commercial_request_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_document_line_tenant() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_support_ticket_number() FROM PUBLIC, anon, authenticated;

-- 2) Funciones que la app NO llama por RPC (o que solo usan otros triggers
--    SECURITY DEFINER, que corren como postgres): solo service_role.
REVOKE EXECUTE ON FUNCTION public.get_current_tenant_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_portal_invoice(uuid) FROM PUBLIC, anon, authenticated;      -- sin filtro de tenant
REVOKE EXECUTE ON FUNCTION public.consume_stock_for_document(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_po_number(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_transfer_number(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_delivery_note_number(uuid) FROM PUBLIC, anon, authenticated;

-- 3) get_team_members: estaba concedida a PUBLIC (anon incluido) y no verificaba
--    que quien llama pertenezca al tenant: con un tenant_id cualquiera se
--    listaba el equipo completo (correo, nombre, rol). Guarda nueva + sin anon.
REVOKE EXECUTE ON FUNCTION public.get_team_members(uuid) FROM PUBLIC, anon;

DO $$
DECLARE v text;
BEGIN
    SELECT pg_get_functiondef('public.get_team_members(uuid)'::regprocedure) INTO v;
    IF position('No autorizado: no perteneces a esa empresa' in v) = 0 THEN
        v := replace(v,
            E'BEGIN\n    RETURN QUERY',
            E'BEGIN\n    -- service_role (auth.uid() nulo) pasa; un usuario solo ve su propio tenant.\n'
            || E'    IF auth.uid() IS NOT NULL AND NOT public.is_platform_admin() AND NOT EXISTS (\n'
            || E'        SELECT 1 FROM user_tenants x WHERE x.user_id = auth.uid() AND x.tenant_id = p_tenant_id\n'
            || E'    ) THEN\n'
            || E'        RAISE EXCEPTION ''No autorizado: no perteneces a esa empresa'';\n'
            || E'    END IF;\n\n    RETURN QUERY');
        EXECUTE v;
    END IF;
END $$;

-- 4) get_inventory_valuation: no filtraba por tenant.
DO $$
DECLARE v text;
BEGIN
    SELECT pg_get_functiondef('public.get_inventory_valuation(text)'::regprocedure) INTO v;
    IF position('p.tenant_id = get_my_tenant_id()' in v) = 0 THEN
        v := replace(v, 'LEFT JOIN inventory_movements im ON p.id = im.product_id',
                        'LEFT JOIN inventory_movements im ON p.id = im.product_id AND im.tenant_id = p.tenant_id');
        v := replace(v, 'WHERE (', 'WHERE p.tenant_id = get_my_tenant_id() AND (');
        EXECUTE v;
    END IF;
END $$;

-- 5) Importadores WorldOffice: solo exigían pertenecer al tenant, así que
--    cualquier empleado podía reescribir terceros, inventario, PUC o saldos.
--    Ahora exigen además administrar el equipo (SUPER ADMIN / ADMIN / can_admin
--    en settings / team_admins), igual que la gestión de usuarios.
DO $$
DECLARE r record; v text;
BEGIN
    FOR r IN
        SELECT p.oid
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN ('import_parties_wo','import_chart_accounts_wo','import_fixed_assets_wo',
                            'import_inventory_wo','import_opening_balances_wo','import_receivables_wo',
                            'update_product_tax_wo')
    LOOP
        v := pg_get_functiondef(r.oid);
        IF position('can_manage_team(p_tenant_id)' in v) = 0 THEN
            v := replace(v,
                'IF auth.uid() IS NOT NULL AND p_tenant_id <> get_my_tenant_id() THEN',
                'IF auth.uid() IS NOT NULL AND (p_tenant_id <> get_my_tenant_id() OR NOT public.can_manage_team(p_tenant_id)) THEN');
            EXECUTE v;
        END IF;
    END LOOP;
END $$;
