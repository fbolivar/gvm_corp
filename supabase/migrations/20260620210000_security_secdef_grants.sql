-- Seguridad: restringir quién puede ejecutar funciones SECURITY DEFINER.
-- En Postgres el EXECUTE por defecto va a PUBLIC (heredado por anon). Aquí se
-- revoca de PUBLIC/anon y se concede explícitamente a los roles correctos.
-- No cambia la lógica del app (cada función mantiene su autorización interna).
DO $do$
DECLARE
  r record;
  v_anon_safe text[] := ARRAY[
    'get_tenant_by_domain','get_platform_config','get_email_by_username',
    'get_my_tenant_id','get_current_tenant_id','is_system_admin','is_platform_admin'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname AS name, t.typname AS rettype
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_type t ON t.oid = p.prorettype
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || r.sig || ' FROM PUBLIC';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || r.sig || ' FROM anon';

    IF r.rettype = 'trigger' THEN
      -- Triggers: el motor los ejecuta solo; no se llaman por API.
      EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || r.sig || ' FROM authenticated';
    ELSE
      EXECUTE 'GRANT EXECUTE ON FUNCTION ' || r.sig || ' TO authenticated, service_role';
      IF r.name = ANY(v_anon_safe) THEN
        EXECUTE 'GRANT EXECUTE ON FUNCTION ' || r.sig || ' TO anon';
      END IF;
    END IF;
  END LOOP;
END
$do$;
