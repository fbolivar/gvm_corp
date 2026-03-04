-- Allow users to see profiles of other users in the same tenant
-- Required for: LinkUserModal (employee linking), team management views
-- The existing "profiles_own" policy only allows seeing your own profile,
-- which prevents admins from seeing team member profiles.

CREATE POLICY "profiles_same_tenant_read" ON profiles
    FOR SELECT
    USING (
        id IN (
            SELECT ut.user_id
            FROM user_tenants ut
            WHERE ut.tenant_id = get_my_tenant_id()
        )
    );
