-- ============================================================================
-- Tenant Branding + Custom Domains
-- Allows each tenant to have its own visual identity and domain
-- ============================================================================

-- 1. Extend tenants table with branding and domain fields
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_domain TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#6366f1';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#10b981';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS app_name TEXT;

-- 2. Unique constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenants_slug_unique') THEN
    ALTER TABLE tenants ADD CONSTRAINT tenants_slug_unique UNIQUE (slug);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenants_custom_domain_unique') THEN
    ALTER TABLE tenants ADD CONSTRAINT tenants_custom_domain_unique UNIQUE (custom_domain);
  END IF;
END $$;

-- 3. Pre-configure GVM tenant
UPDATE tenants
SET
  slug = 'gvm',
  custom_domain = 'gvmcorp.gvm.com.co',
  app_name = 'GVM Corp ERP',
  primary_color = '#4f46e5',
  accent_color = '#10b981'
WHERE id = 'f188e4a2-1918-4102-8ebd-c82fc16d4ba9' AND slug IS NULL;

-- 4. Public RPC: resolve tenant by hostname (for middleware + unauth pages)
CREATE OR REPLACE FUNCTION get_tenant_by_domain(p_domain TEXT)
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  slug TEXT,
  app_name TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT,
  accent_color TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.name,
    t.slug,
    t.app_name,
    t.logo_url,
    t.favicon_url,
    t.primary_color,
    t.accent_color
  FROM tenants t
  WHERE t.custom_domain = p_domain OR t.slug = p_domain
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_tenant_by_domain(TEXT) TO anon, authenticated, service_role;

-- 5. RPC: get current tenant's branding (for logged-in users)
CREATE OR REPLACE FUNCTION get_my_tenant_branding()
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  app_name TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT,
  accent_color TEXT,
  custom_domain TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.name,
    t.app_name,
    t.logo_url,
    t.favicon_url,
    t.primary_color,
    t.accent_color,
    t.custom_domain
  FROM tenants t
  WHERE t.id = get_my_tenant_id()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_my_tenant_branding() TO authenticated, service_role;

-- 6. Update list_all_tenants_admin to include domain and branding fields
DROP FUNCTION IF EXISTS list_all_tenants_admin();

CREATE OR REPLACE FUNCTION list_all_tenants_admin()
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  nit TEXT,
  slug TEXT,
  custom_domain TEXT,
  logo_url TEXT,
  primary_color TEXT,
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
    t.slug,
    t.custom_domain,
    t.logo_url,
    t.primary_color,
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
