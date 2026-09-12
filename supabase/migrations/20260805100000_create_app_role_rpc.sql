-- Creación de roles desde la Matriz de Gobernanza (/settings/team).
--
-- app_roles solo admite escritura por is_system_admin() (RLS), lo que dejaba fuera
-- a quienes SÍ gestionan el equipo por excepción (team_admins, p. ej. Laura Bolívar)
-- o por can_admin en 'settings'. Esta RPC SECURITY DEFINER usa la MISMA regla que
-- upsert_role_permission: can_manage_team(get_my_tenant_id()).
--
-- Anti-escalada: los nombres de rol administrativos siguen reservados a
-- SUPER ADMINISTRADOR / ADMINISTRADOR (is_system_admin).

CREATE OR REPLACE FUNCTION public.create_app_role(
    p_name        text,
    p_description text DEFAULT NULL
)
RETURNS public.app_roles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_name text;
    v_desc text;
    v_row  public.app_roles;
BEGIN
    IF NOT public.can_manage_team(public.get_my_tenant_id()) THEN
        RAISE EXCEPTION 'No autorizado para crear roles';
    END IF;

    -- Normalización: mayúsculas, sin espacios repetidos (los roles se comparan por nombre)
    v_name := upper(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')));
    v_desc := nullif(btrim(coalesce(p_description, '')), '');

    IF length(v_name) < 3 OR length(v_name) > 50 THEN
        RAISE EXCEPTION 'El nombre del rol debe tener entre 3 y 50 caracteres';
    END IF;

    IF v_name !~ '^[A-ZÑÁÉÍÓÚÜ0-9 ._&/-]+$' THEN
        RAISE EXCEPTION 'El nombre del rol solo admite letras, números, espacios y . _ & / -';
    END IF;

    IF v_name IN ('SUPER ADMINISTRADOR', 'ADMINISTRADOR') AND NOT public.is_system_admin() THEN
        RAISE EXCEPTION 'Solo un SUPER ADMINISTRADOR puede crear el rol "%"', v_name;
    END IF;

    IF EXISTS (SELECT 1 FROM public.app_roles WHERE upper(name) = v_name) THEN
        RAISE EXCEPTION 'Ya existe un rol llamado "%"', v_name;
    END IF;

    INSERT INTO public.app_roles (name, description)
    VALUES (v_name, v_desc)
    RETURNING * INTO v_row;

    -- El rol nace SIN permisos: se habilitan módulo por módulo en la matriz.
    RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_app_role(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_app_role(text, text) TO authenticated;

COMMENT ON FUNCTION public.create_app_role(text, text) IS
    'Crea un rol en app_roles. Autoriza con can_manage_team (incluye team_admins). Nombres administrativos reservados a is_system_admin.';
