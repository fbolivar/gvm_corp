-- ============================================================================
-- Fix: Auto-create profiles on auth.users INSERT + proper GRANTs
-- Problem: New users created via admin API had no profiles row.
--          get_team_members RPC joins with profiles → user invisible.
-- ============================================================================

-- 1. Ensure profiles table exists with proper structure
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Trigger: auto-create profile when auth user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        updated_at = now();
    RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3. GRANTs on profiles and user_tenants
GRANT ALL ON TABLE profiles TO authenticated;
GRANT ALL ON TABLE profiles TO service_role;
GRANT ALL ON TABLE user_tenants TO authenticated;
GRANT ALL ON TABLE user_tenants TO service_role;

-- 4. Ensure unique constraint on user_tenants for upsert to work
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'user_tenants_tenant_user_unique'
    ) THEN
        ALTER TABLE user_tenants
            ADD CONSTRAINT user_tenants_tenant_user_unique
            UNIQUE (tenant_id, user_id);
    END IF;
EXCEPTION WHEN duplicate_table THEN
    -- constraint already exists under a different name
    NULL;
END $$;

-- 5. Recreate get_team_members RPC with LEFT JOIN to handle missing profiles
DROP FUNCTION IF EXISTS get_team_members(UUID);
CREATE OR REPLACE FUNCTION get_team_members(p_tenant_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    role TEXT,
    role_id UUID,
    zone_id UUID,
    role_name TEXT,
    zone_name TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    email TEXT,
    full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ut.id,
        ut.user_id,
        ut.role,
        ut.role_id,
        ut.zone_id,
        ar.name AS role_name,
        z.name AS zone_name,
        ut.status,
        ut.created_at,
        COALESCE(p.email, u.email, 'Sin email') AS email,
        COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) AS full_name
    FROM user_tenants ut
    LEFT JOIN profiles p ON p.id = ut.user_id
    LEFT JOIN auth.users u ON u.id = ut.user_id
    LEFT JOIN app_roles ar ON ar.id = ut.role_id
    LEFT JOIN zones z ON z.id = ut.zone_id
    WHERE ut.tenant_id = p_tenant_id
    ORDER BY ut.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_team_members(UUID) TO authenticated, service_role;
