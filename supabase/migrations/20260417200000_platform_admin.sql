-- ============================================================================
-- Platform Admin (BC Fabric SAS super-admin, above all tenants)
-- Different from is_system_admin which is tenant-level admin
-- ============================================================================

-- Add flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Mark Francisco as platform admin
UPDATE profiles
SET is_platform_admin = TRUE
WHERE id = '4d529f53-df07-434d-a7b6-d3e9b3f34634';

-- Helper function (SECURITY DEFINER to avoid RLS on profiles)
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_platform_admin FROM profiles WHERE id = auth.uid()), FALSE);
$$;

GRANT EXECUTE ON FUNCTION is_platform_admin() TO authenticated, service_role;

-- RPC: list all tenants with key info (platform admin only)
CREATE OR REPLACE FUNCTION list_all_tenants_admin()
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  nit TEXT,
  created_at TIMESTAMPTZ,
  license_plan TEXT,
  license_status TEXT,
  license_valid_until DATE,
  max_users INT,
  users_count BIGINT,
  documents_count BIGINT
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
    t.id AS tenant_id,
    t.name AS tenant_name,
    t.nit,
    t.created_at,
    COALESCE(tl.plan, 'NONE') AS license_plan,
    COALESCE(tl.status, 'NONE') AS license_status,
    tl.valid_until AS license_valid_until,
    COALESCE(tl.max_users, 0) AS max_users,
    (SELECT COUNT(*) FROM user_tenants ut WHERE ut.tenant_id = t.id) AS users_count,
    (SELECT COUNT(*) FROM documents d WHERE d.tenant_id = t.id) AS documents_count
  FROM tenants t
  LEFT JOIN tenant_licenses tl ON tl.tenant_id = t.id
  ORDER BY t.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION list_all_tenants_admin() TO authenticated;

-- RPC: platform metrics
CREATE OR REPLACE FUNCTION get_platform_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: platform admin required';
  END IF;

  SELECT json_build_object(
    'total_tenants', (SELECT COUNT(*) FROM tenants),
    'active_licenses', (SELECT COUNT(*) FROM tenant_licenses WHERE status = 'ACTIVE' AND valid_until >= CURRENT_DATE),
    'expired_licenses', (SELECT COUNT(*) FROM tenant_licenses WHERE valid_until < CURRENT_DATE),
    'total_users', (SELECT COUNT(*) FROM user_tenants WHERE status = 'active'),
    'plans', json_build_object(
      'enterprise', (SELECT COUNT(*) FROM tenant_licenses WHERE plan = 'ENTERPRISE'),
      'professional', (SELECT COUNT(*) FROM tenant_licenses WHERE plan = 'PROFESSIONAL'),
      'starter', (SELECT COUNT(*) FROM tenant_licenses WHERE plan = 'STARTER'),
      'trial', (SELECT COUNT(*) FROM tenant_licenses WHERE plan = 'TRIAL')
    ),
    'tenants_created_this_month', (
      SELECT COUNT(*) FROM tenants
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_platform_metrics() TO authenticated;
