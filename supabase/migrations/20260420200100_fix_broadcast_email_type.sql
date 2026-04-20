-- Fix: auth.users.email es varchar(255), no TEXT
-- Error "structure of query does not match function result type" rompía /super-admin/broadcast

DROP FUNCTION IF EXISTS get_tenant_admins_for_broadcast(TEXT[], TEXT[]);

CREATE OR REPLACE FUNCTION get_tenant_admins_for_broadcast(
  p_plans TEXT[] DEFAULT NULL,
  p_statuses TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  plan TEXT,
  status TEXT,
  admin_user_id UUID,
  admin_email TEXT,
  admin_full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: platform admin required';
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (t.id, u.id)
    t.id AS tenant_id,
    t.name::TEXT AS tenant_name,
    tl.plan::TEXT,
    tl.status::TEXT,
    u.id AS admin_user_id,
    u.email::TEXT AS admin_email,
    p.full_name::TEXT AS admin_full_name
  FROM tenants t
  LEFT JOIN tenant_licenses tl ON tl.tenant_id = t.id
  INNER JOIN user_tenants ut ON ut.tenant_id = t.id AND ut.status = 'active'
  INNER JOIN auth.users u ON u.id = ut.user_id
  LEFT JOIN profiles p ON p.id = u.id
  WHERE (p_plans IS NULL OR tl.plan = ANY(p_plans))
    AND (p_statuses IS NULL OR tl.status = ANY(p_statuses))
    AND ut.role ILIKE ANY (ARRAY['%admin%', '%owner%', 'SUPER ADMINISTRADOR', 'ADMINISTRADOR'])
  ORDER BY t.id, u.id, ut.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_tenant_admins_for_broadcast(TEXT[], TEXT[]) TO authenticated;
