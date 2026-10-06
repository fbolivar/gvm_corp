-- PRP-007 hardening (revisión de seguridad): el cierre de una evaluación de
-- período de prueba es una sola transacción en el servidor. Ningún cliente
-- inserta respuestas ni cambia el estado directamente.

CREATE OR REPLACE FUNCTION close_probation_evaluation(
    p_evaluation uuid,
    p_scores jsonb,
    p_outcome text,
    p_comments text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_eval performance_evaluations%ROWTYPE;
    v_required int;
    v_given int;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
    IF p_outcome NOT IN ('MEETS', 'DOES_NOT_MEET') THEN RAISE EXCEPTION 'Resultado inválido'; END IF;
    IF jsonb_typeof(p_scores) <> 'array' THEN RAISE EXCEPTION 'Calificaciones inválidas'; END IF;

    SELECT * INTO v_eval FROM performance_evaluations
    WHERE id = p_evaluation AND tenant_id = get_my_tenant_id();
    IF NOT FOUND THEN RAISE EXCEPTION 'Evaluación no encontrada'; END IF;
    IF v_eval.eval_type <> 'PROBATION' THEN RAISE EXCEPTION 'Tipo de evaluación no soportado'; END IF;
    IF v_eval.status = 'CLOSED' THEN RAISE EXCEPTION 'Esta evaluación ya está cerrada'; END IF;

    IF NOT EXISTS (
        SELECT 1 FROM performance_evaluators
        WHERE evaluation_id = p_evaluation AND evaluator_id = v_uid AND status = 'PENDING'
    ) THEN
        RAISE EXCEPTION 'No estás asignado como evaluador pendiente de esta evaluación';
    END IF;

    IF NOT is_performance_manager() AND NOT EXISTS (
        SELECT 1 FROM user_tenants ut
        JOIN role_permissions rp ON rp.role_id = ut.role_id
        WHERE ut.user_id = v_uid AND ut.tenant_id = v_eval.tenant_id
          AND rp.module_key = 'payroll:performance' AND rp.can_edit = true
    ) THEN
        RAISE EXCEPTION 'Ya no tienes permiso para evaluar';
    END IF;

    SELECT count(*) INTO v_required FROM performance_criteria c
    WHERE c.tenant_id = v_eval.tenant_id
      AND c.eval_type = 'PROBATION'
      AND c.is_active
      AND (c.role_id IS NULL OR c.role_id = v_eval.role_id_snapshot);

    v_given := jsonb_array_length(p_scores);
    IF v_given <> v_required THEN RAISE EXCEPTION 'Faltan criterios por calificar'; END IF;

    IF (SELECT count(DISTINCT s->>'criterionId') FROM jsonb_array_elements(p_scores) s) <> v_given THEN
        RAISE EXCEPTION 'Criterios repetidos';
    END IF;

    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_scores) s
        WHERE NOT EXISTS (
            SELECT 1 FROM performance_criteria c
            WHERE c.id = (s->>'criterionId')::uuid
              AND c.tenant_id = v_eval.tenant_id
              AND c.eval_type = 'PROBATION'
              AND c.is_active
              AND (c.role_id IS NULL OR c.role_id = v_eval.role_id_snapshot)
        )
        OR (s->>'score')::int NOT BETWEEN 1 AND 5
    ) THEN
        RAISE EXCEPTION 'Criterio o calificación inválidos';
    END IF;

    INSERT INTO performance_answers (tenant_id, evaluation_id, evaluator_id, criterion_id, score, comment)
    SELECT v_eval.tenant_id, p_evaluation, v_uid,
           (s->>'criterionId')::uuid,
           (s->>'score')::int,
           NULLIF(trim(s->>'comment'), '')
    FROM jsonb_array_elements(p_scores) s;

    UPDATE performance_evaluators
    SET status = 'DONE', submitted_at = now()
    WHERE evaluation_id = p_evaluation AND evaluator_id = v_uid;

    UPDATE performance_evaluations
    SET status = 'CLOSED',
        probation_outcome = p_outcome,
        outcome_comments = NULLIF(trim(p_comments), ''),
        closed_at = now()
    WHERE id = p_evaluation;
END;
$$;

REVOKE EXECUTE ON FUNCTION close_probation_evaluation(uuid, jsonb, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION close_probation_evaluation(uuid, jsonb, text, text) TO authenticated;

-- Un solo proceso de evaluación de prueba abierto por empleado
CREATE UNIQUE INDEX IF NOT EXISTS uq_performance_probation_open
    ON performance_evaluations (employee_id)
    WHERE eval_type = 'PROBATION' AND status <> 'CLOSED';

-- Retirar escrituras directas de evaluadores
DROP POLICY IF EXISTS "pa_own_insert" ON performance_answers;
DROP POLICY IF EXISTS "pev_own_update" ON performance_evaluators;

-- Lectura: gestores o evaluadores asignados (el empleado evaluado llega en la fase de portal)
DROP POLICY IF EXISTS "pe_tenant_select" ON performance_evaluations;
DROP POLICY IF EXISTS "pev_tenant_select" ON performance_evaluators;
DROP POLICY IF EXISTS "pa_tenant_select" ON performance_answers;

CREATE POLICY "pe_scoped_select" ON performance_evaluations FOR SELECT USING (
    tenant_id = get_my_tenant_id() AND (
        is_performance_manager()
        OR EXISTS (SELECT 1 FROM performance_evaluators ev
                   WHERE ev.evaluation_id = performance_evaluations.id AND ev.evaluator_id = auth.uid())
    )
);

CREATE POLICY "pev_scoped_select" ON performance_evaluators FOR SELECT USING (
    tenant_id = get_my_tenant_id() AND (is_performance_manager() OR evaluator_id = auth.uid())
);

CREATE POLICY "pa_scoped_select" ON performance_answers FOR SELECT USING (
    tenant_id = get_my_tenant_id() AND (is_performance_manager() OR evaluator_id = auth.uid())
);

-- Actualización directa solo para gestores, y solo mientras esté abierta
DROP POLICY IF EXISTS "pe_open_update" ON performance_evaluations;
CREATE POLICY "pe_manager_update" ON performance_evaluations FOR UPDATE
    USING (tenant_id = get_my_tenant_id() AND status <> 'CLOSED' AND is_performance_manager())
    WITH CHECK (tenant_id = get_my_tenant_id() AND is_performance_manager());
