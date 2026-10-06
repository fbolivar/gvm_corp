-- PRP-007 Fase 5: aplicar un incremento salarial con aprobación separada.
-- Flujo: solicitud (gestor de desempeño) → aprobación (editor de nómina distinto)
-- → aplicación (editor de nómina, solo si el salario no cambió desde la solicitud).
-- Quien evaluó o es el propio empleado no puede solicitar ni aprobar.

CREATE OR REPLACE FUNCTION is_payroll_editor()
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
                  WHERE rp.role_id = ut.role_id AND rp.module_key = 'payroll' AND rp.can_edit = true
              )
          )
    );
$$;

REVOKE EXECUTE ON FUNCTION is_payroll_editor() FROM anon, public;
GRANT EXECUTE ON FUNCTION is_payroll_editor() TO authenticated;

CREATE TABLE IF NOT EXISTS salary_increase_approvals (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    evaluation_id    uuid NOT NULL UNIQUE REFERENCES performance_evaluations(id),
    employee_id      uuid NOT NULL REFERENCES employees(id),
    previous_salary  numeric NOT NULL,
    pct              numeric NOT NULL CHECK (pct > 0 AND pct <= 100),
    new_salary       numeric NOT NULL,
    status           text NOT NULL DEFAULT 'PENDING'
                         CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'APPLIED')),
    requested_by     uuid NOT NULL REFERENCES profiles(id),
    requested_at     timestamptz NOT NULL DEFAULT now(),
    decided_by       uuid REFERENCES profiles(id),
    decided_at       timestamptz,
    applied_at       timestamptz,
    CHECK (new_salary >= previous_salary),
    CHECK (decided_by IS NULL OR decided_by <> requested_by)
);

ALTER TABLE salary_increase_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sia_payroll_select" ON salary_increase_approvals FOR SELECT
    USING (tenant_id = get_my_tenant_id() AND is_payroll_editor());

CREATE OR REPLACE FUNCTION request_salary_increase(p_evaluation uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_tenant uuid := get_my_tenant_id();
    v_eval performance_evaluations%ROWTYPE;
    v_pct numeric;
    v_emp employees%ROWTYPE;
    v_emp_user uuid;
    v_id uuid;
BEGIN
    IF NOT is_performance_manager() THEN RAISE EXCEPTION 'Sin permiso para solicitar incrementos'; END IF;

    SELECT * INTO v_eval FROM performance_evaluations
    WHERE id = p_evaluation AND tenant_id = v_tenant;
    IF NOT FOUND OR v_eval.eval_type <> 'ANNUAL' OR v_eval.status <> 'CLOSED' THEN
        RAISE EXCEPTION 'Evaluación anual cerrada no encontrada';
    END IF;

    SELECT pct INTO v_pct FROM performance_salary_recommendations WHERE evaluation_id = p_evaluation;
    IF v_pct IS NULL OR v_pct <= 0 THEN RAISE EXCEPTION 'Esta evaluación no tiene incremento recomendado'; END IF;

    IF EXISTS (SELECT 1 FROM performance_evaluators WHERE evaluation_id = p_evaluation AND evaluator_id = v_uid) THEN
        RAISE EXCEPTION 'Quien evaluó no puede solicitar el incremento';
    END IF;

    SELECT * INTO v_emp FROM employees WHERE id = v_eval.employee_id AND tenant_id = v_tenant;
    IF NOT FOUND OR v_emp.status <> 'ACTIVE' THEN RAISE EXCEPTION 'El empleado no está activo'; END IF;
    IF v_emp.salary IS NULL OR v_emp.salary <= 0 THEN RAISE EXCEPTION 'El empleado no tiene salario registrado'; END IF;
    v_emp_user := v_emp.user_id;
    IF v_emp_user IS NOT NULL AND v_emp_user = v_uid THEN RAISE EXCEPTION 'Nadie puede solicitar su propio incremento'; END IF;

    INSERT INTO salary_increase_approvals
        (tenant_id, evaluation_id, employee_id, previous_salary, pct, new_salary, requested_by)
    VALUES
        (v_tenant, p_evaluation, v_emp.id, v_emp.salary, v_pct,
         round(v_emp.salary * (1 + v_pct / 100)), v_uid)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

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
    IF NOT is_payroll_editor() THEN RAISE EXCEPTION 'Sin permiso para aprobar incrementos'; END IF;

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
    v_row salary_increase_approvals%ROWTYPE;
BEGIN
    IF NOT is_payroll_editor() THEN RAISE EXCEPTION 'Sin permiso para aplicar incrementos'; END IF;

    SELECT * INTO v_row FROM salary_increase_approvals
    WHERE id = p_id AND tenant_id = get_my_tenant_id() FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada'; END IF;
    IF v_row.status <> 'APPROVED' THEN RAISE EXCEPTION 'Solo se aplican incrementos aprobados'; END IF;

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

REVOKE EXECUTE ON FUNCTION request_salary_increase(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION decide_salary_increase(uuid, boolean) FROM anon, public;
REVOKE EXECUTE ON FUNCTION apply_salary_increase(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION request_salary_increase(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION decide_salary_increase(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_salary_increase(uuid) TO authenticated;
