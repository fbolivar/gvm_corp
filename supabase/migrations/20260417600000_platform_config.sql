-- ============================================================================
-- Platform config (single row) — master branding for BC Fabric SAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_logo_url TEXT,
  master_favicon_url TEXT,
  company_name TEXT DEFAULT 'BC Fabric SAS',
  legal_name TEXT DEFAULT 'BC FABRIC S.A.S',
  tax_id TEXT,
  support_email TEXT DEFAULT 'soporte@bc-security.com',
  support_phone TEXT,
  website TEXT DEFAULT 'https://bc-security.com',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Singleton: only one row allowed
CREATE UNIQUE INDEX IF NOT EXISTS platform_config_singleton
  ON platform_config ((true));

-- Seed default row
INSERT INTO platform_config (id)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid)
ON CONFLICT DO NOTHING;

-- Bucket for platform assets (same as tenant-branding public bucket)

-- RLS: only platform admins can update
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_config_select ON platform_config;
CREATE POLICY platform_config_select ON platform_config
  FOR SELECT USING (true); -- public read (used by super admin login/layout)

DROP POLICY IF EXISTS platform_config_modify ON platform_config;
CREATE POLICY platform_config_modify ON platform_config
  FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- RPC to get config (public, for login page etc.)
CREATE OR REPLACE FUNCTION get_platform_config()
RETURNS platform_config
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM platform_config LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_platform_config() TO anon, authenticated, service_role;
