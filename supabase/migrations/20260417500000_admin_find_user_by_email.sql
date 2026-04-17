-- Find auth.users by email (fast lookup, SECURITY DEFINER to read auth schema)
-- Only callable by platform admins

CREATE OR REPLACE FUNCTION admin_find_user_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: platform admin required';
  END IF;

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = lower(trim(p_email))
  LIMIT 1;

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_find_user_by_email(TEXT) TO authenticated, service_role;
