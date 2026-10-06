-- PRP-007 fase 5: aprobar y aplicar incrementos solo para quien administra nómina
-- (permiso can_admin en payroll o rol de alto nivel). Antes bastaba con can_edit,
-- lo que incluía contadores y tesorería.

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
          AND (
              ut.role IN ('SUPER ADMINISTRADOR', 'ADMINISTRADOR', 'owner', 'admin')
              OR EXISTS (
                  SELECT 1 FROM role_permissions rp
                  WHERE rp.role_id = ut.role_id AND rp.module_key = 'payroll' AND rp.can_admin = true
              )
          )
    );
$$;

REVOKE EXECUTE ON FUNCTION is_salary_approver() FROM anon, public;
GRANT EXECUTE ON FUNCTION is_salary_approver() TO authenticated;

DROP POLICY IF EXISTS "sia_payroll_select" ON salary_increase_approvals;
CREATE POLICY "sia_approver_select" ON salary_increase_approvals FOR SELECT
    USING (tenant_id = get_my_tenant_id() AND is_salary_approver());

CREATE OR REPLACE FUNCTION decide_salary_increase(p_id uuid, p_approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_row salary_increase_approvals%ROWTYPE;
    v_emp_user uuid;
BEGIN
    IF NOT is_salary_approver() THEN RAISE EXCEPTION 'Sin permiso para aprobar incrementos'; END IF;

    SELECT * INTO v_row FROM salary_increase_approvals
    WHERE id = p_id AND tenant_id = get_my_tenant_id() FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada'; END IF;
    IF v_row.status <> 'PENDING' THEN RAISE EXCEPTION 'La solicitud ya fue decidida'; END IF;
    IF v_row.requested_by = v_uid THEN RAISE EXCEPTION 'Quien solicitó no puede aprobar'; END IF;
    IF EXISTS (SELECT 1 FROM performance_evaluators WHERE evaluation_id = v_row.evaluation_id AND evaluator_id = v_uid) THEN
        RAISE EXCEPTION 'Quien evaluó no puede aprobar este incremento';
    END IF;
    SELECT user_id INTO v_emp_user FROM employees WHERE id = v_row.employee_id;
    IF v_emp_user IS NOT NULL AND v_emp_user = v_uid THEN RAISE EXCEPTION 'Nadie puede aprobar su propio incremento'; END IF;

    UPDATE salary_increase_approvals
    SET status = CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END,
        decided_by = v_uid, decided_at = now()
    WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION apply_salary_increase(p_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_row salary_increase_approvals%ROWTYPE;
    v_emp_user uuid;
BEGIN
    IF NOT is_salary_approver() THEN RAISE EXCEPTION 'Sin permiso para aplicar incrementos'; END IF;

    SELECT * INTO v_row FROM salary_increase_approvals
    WHERE id = p_id AND tenant_id = get_my_tenant_id() FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada'; END IF;
    IF v_row.status <> 'APPROVED' THEN RAISE EXCEPTION 'Solo se aplican incrementos aprobados'; END IF;
    IF v_row.requested_by = v_uid THEN RAISE EXCEPTION 'Quien solicitó no puede aplicar el incremento'; END IF;
    SELECT user_id INTO v_emp_user FROM employees WHERE id = v_row.employee_id;
    IF v_emp_user IS NOT NULL AND v_emp_user = v_uid THEN RAISE EXCEPTION 'Nadie puede aplicar su propio incremento'; END IF;

    UPDATE employees SET salary = v_row.new_salary
    WHERE id = v_row.employee_id AND tenant_id = v_row.tenant_id
      AND status = 'ACTIVE' AND salary = v_row.previous_salary;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El salario cambió desde la solicitud o el empleado ya no está activo; vuelve a solicitar';
    END IF;

    UPDATE salary_increase_approvals SET status = 'APPLIED', applied_at = now() WHERE id = p_id;
    RETURN v_row.new_salary;
END;
$$;

DROP FUNCTION IF EXISTS is_payroll_editor();
