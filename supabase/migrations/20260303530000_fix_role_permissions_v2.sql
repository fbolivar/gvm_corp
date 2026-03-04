-- ============================================================================
-- Fix: role_permissions — create missing upsert RPC + ensure proper grants
-- Problem: upsert_role_permission RPC referenced in code but never created.
--          Fallback direct upsert blocked by missing GRANT + RLS.
-- Note: v2 because previous migration was partially applied.
-- ============================================================================

-- 1. Explicit GRANT on catalog tables
GRANT ALL ON TABLE role_permissions TO authenticated;
GRANT ALL ON TABLE role_permissions TO service_role;
GRANT ALL ON TABLE app_roles TO authenticated;
GRANT ALL ON TABLE app_roles TO service_role;
GRANT ALL ON TABLE app_modules TO authenticated;
GRANT ALL ON TABLE app_modules TO service_role;

-- 2. Create the missing upsert_role_permission RPC (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION upsert_role_permission(
    p_role_id UUID,
    p_module_key TEXT,
    p_can_view BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO role_permissions (role_id, module_key, can_view, can_edit)
    VALUES (p_role_id, p_module_key, p_can_view, p_can_view)
    ON CONFLICT (role_id, module_key)
    DO UPDATE SET can_view = p_can_view, can_edit = p_can_view;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_role_permission(UUID, TEXT, BOOLEAN) TO authenticated, service_role;
