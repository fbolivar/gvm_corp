-- PRP-007: el resultado del período de prueba lo calcula el servidor a partir del
-- promedio de calificaciones. Mínimo para "cumple": 3,0 sobre 5 (pendiente de
-- confirmación de RRHH; cambiar aquí y en PROBATION_MIN_AVERAGE).

DROP FUNCTION IF EXISTS close_probation_evaluation(uuid, jsonb, text, text);

CREATE FUNCTION close_probation_evaluation(
    p_evaluation uuid,
    p_scores jsonb,
    p_comments text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_eval performance_evaluations%ROWTYPE;
    v_required int;
    v_given int;
    v_avg numeric;
    v_outcome text;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
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

    SELECT avg((s->>'score')::int) INTO v_avg FROM jsonb_array_elements(p_scores) s;
    v_outcome := CASE WHEN v_avg >= 3.0 THEN 'MEETS' ELSE 'DOES_NOT_MEET' END;

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
        probation_outcome = v_outcome,
        outcome_comments = NULLIF(trim(p_comments), ''),
        closed_at = now()
    WHERE id = p_evaluation;

    RETURN v_outcome;
END;
$$;

REVOKE EXECUTE ON FUNCTION close_probation_evaluation(uuid, jsonb, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION close_probation_evaluation(uuid, jsonb, text) TO authenticated;
