-- PRP-007: solo quien puede gestionar evaluaciones (payroll:performance can_edit o
-- rol de alto nivel) crea evaluaciones y asigna evaluadores. Cerrar una evaluación
-- lo puede hacer su evaluador asignado (la Server Action valida el resto).

CREATE OR REPLACE FUNCTION is_performance_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_tenants ut
        WHERE ut.user_id = auth.uid()
          AND ut.tenant_id = get_my_tenant_id()
          AND ut.status = 'active'
          AND (
              ut.role IN ('SUPER ADMINISTRADOR', 'ADMINISTRADOR', 'owner', 'admin')
              OR EXISTS (
                  SELECT 1 FROM role_permissions rp
                  WHERE rp.role_id = ut.role_id
                    AND rp.module_key = 'payroll:performance'
                    AND rp.can_edit = true
              )
          )
    );
$$;

REVOKE EXECUTE ON FUNCTION is_performance_manager() FROM anon;
GRANT EXECUTE ON FUNCTION is_performance_manager() TO authenticated;

DROP POLICY IF EXISTS "pe_tenant_insert" ON performance_evaluations;
DROP POLICY IF EXISTS "pe_open_update" ON performance_evaluations;
DROP POLICY IF EXISTS "pev_tenant_insert" ON performance_evaluators;

CREATE POLICY "pe_manager_insert" ON performance_evaluations FOR INSERT WITH CHECK (
    tenant_id = get_my_tenant_id() AND is_performance_manager()
);

CREATE POLICY "pe_open_update" ON performance_evaluations FOR UPDATE USING (
    tenant_id = get_my_tenant_id()
    AND status <> 'CLOSED'
    AND (
        is_performance_manager()
        OR EXISTS (
            SELECT 1 FROM performance_evaluators ev
            WHERE ev.evaluation_id = performance_evaluations.id
              AND ev.evaluator_id = auth.uid()
        )
    )
);

CREATE POLICY "pev_manager_insert" ON performance_evaluators FOR INSERT WITH CHECK (
    tenant_id = get_my_tenant_id() AND is_performance_manager()
);

CREATE POLICY "pe_manager_delete" ON performance_evaluations FOR DELETE USING (
    tenant_id = get_my_tenant_id() AND status <> 'CLOSED' AND is_performance_manager()
);
