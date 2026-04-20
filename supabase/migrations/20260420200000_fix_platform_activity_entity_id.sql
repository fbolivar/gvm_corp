-- Fix: audit_log.entity_id es TEXT, no UUID
-- El error "structure of query does not match function result type"
-- en producción era por este mismatch de tipo.

DROP FUNCTION IF EXISTS get_platform_activity(INT);

CREATE OR REPLACE FUNCTION get_platform_activity(p_limit INT DEFAULT 20)
RETURNS TABLE (
  log_id UUID,
  tenant_id UUID,
  tenant_name TEXT,
  actor_user_id UUID,
  actor_name TEXT,
  action TEXT,
  entity TEXT,
  entity_id TEXT,
  created_at TIMESTAMPTZ
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
  SELECT
    al.id AS log_id,
    al.tenant_id,
    t.name AS tenant_name,
    al.actor_user_id,
    p.full_name AS actor_name,
    al.action::TEXT,
    al.entity::TEXT,
    al.entity_id::TEXT,
    al.created_at
  FROM audit_log al
  LEFT JOIN tenants t ON t.id = al.tenant_id
  LEFT JOIN profiles p ON p.id = al.actor_user_id
  WHERE al.entity IN (
    'tenants', 'tenant_licenses', 'documents', 'employees', 'parties', 'products'
  )
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_platform_activity(INT) TO authenticated;
