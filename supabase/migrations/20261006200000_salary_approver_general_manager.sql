-- Aprobación y aplicación de incrementos salariales: solo el General Manager.
-- Antes también pasaban Super Administrador y Administrador.

CREATE OR REPLACE FUNCTION is_salary_approver()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_tenants ut
        WHERE ut.user_id = auth.uid()
          AND ut.tenant_id = get_my_tenant_id()
          AND ut.status = 'active'
          AND ut.role = 'GENERAL MANAGER'
    );
$$;
