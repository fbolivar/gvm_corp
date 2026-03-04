-- Update remove_team_member to also delete the employee record
-- When a user is removed from the team, their employee record should be cleaned up

CREATE OR REPLACE FUNCTION remove_team_member(p_membership_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_tenant_id UUID;
BEGIN
    -- 1. Get user_id and tenant_id before deleting the membership
    SELECT user_id, tenant_id INTO v_user_id, v_tenant_id
    FROM user_tenants
    WHERE id = p_membership_id;

    -- 2. Delete employee record linked to this user in this tenant
    IF v_user_id IS NOT NULL AND v_tenant_id IS NOT NULL THEN
        DELETE FROM employees
        WHERE user_id = v_user_id
          AND tenant_id = v_tenant_id;
    END IF;

    -- 3. Delete the team membership
    DELETE FROM user_tenants WHERE id = p_membership_id;
END;
$$;
