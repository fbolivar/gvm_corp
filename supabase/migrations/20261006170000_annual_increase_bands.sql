-- PRP-007: recomendación de incremento por bandas sobre la calificación final.
-- Normativa colombiana: no fija porcentajes de incremento por mérito, pero el salario
-- no puede reducirse ni quedar por debajo del mínimo; por eso ninguna banda es negativa.
--   < 3,0        → 0 %
--   3,0 – 3,49   → 2 %
--   3,5 – 3,99   → 4 %
--   4,0 – 4,49   → 6 %
--   ≥ 4,5        → 8 %
-- La recomendación se calcula al cerrar la evaluación. Ya no se escribe a mano.

CREATE OR REPLACE FUNCTION annual_increase_pct(p_score numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN p_score >= 4.5 THEN 8
        WHEN p_score >= 4.0 THEN 6
        WHEN p_score >= 3.5 THEN 4
        WHEN p_score >= 3.0 THEN 2
        ELSE 0
    END::numeric;
$$;

REVOKE EXECUTE ON FUNCTION annual_increase_pct(numeric) FROM public, anon, authenticated;

DROP FUNCTION IF EXISTS set_annual_recommendation(uuid, numeric);

CREATE OR REPLACE FUNCTION submit_annual_evaluation(p_evaluation uuid, p_scores jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_eval performance_evaluations%ROWTYPE;
    v_required int;
    v_given int;
    v_pending int;
    v_final numeric;
    v_today date := (now() AT TIME ZONE 'America/Bogota')::date;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
    IF jsonb_typeof(p_scores) <> 'array' THEN RAISE EXCEPTION 'Calificaciones inválidas'; END IF;

    SELECT * INTO v_eval FROM performance_evaluations
    WHERE id = p_evaluation AND tenant_id = get_my_tenant_id()
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Evaluación no encontrada'; END IF;
    IF v_eval.eval_type <> 'ANNUAL' THEN RAISE EXCEPTION 'Tipo de evaluación no soportado'; END IF;
    IF v_eval.status = 'CLOSED' THEN RAISE EXCEPTION 'Esta evaluación ya está cerrada'; END IF;
    IF NOT EXISTS (
        SELECT 1 FROM performance_campaigns c
        WHERE c.id = v_eval.campaign_id AND c.status = 'OPEN'
          AND v_today BETWEEN c.opens_on AND c.closes_on
    ) THEN
        RAISE EXCEPTION 'La campaña no está abierta en este momento';
    END IF;

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
    WHERE c.tenant_id = v_eval.tenant_id AND c.eval_type = 'ANNUAL' AND c.is_active
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
              AND c.tenant_id = v_eval.tenant_id AND c.eval_type = 'ANNUAL' AND c.is_active
              AND (c.role_id IS NULL OR c.role_id = v_eval.role_id_snapshot)
        )
        OR (s->>'score')::int NOT BETWEEN 1 AND 5
    ) THEN
        RAISE EXCEPTION 'Criterio o calificación inválidos';
    END IF;

    INSERT INTO performance_answers (tenant_id, evaluation_id, evaluator_id, criterion_id, score, comment)
    SELECT v_eval.tenant_id, p_evaluation, v_uid,
           (s->>'criterionId')::uuid, (s->>'score')::int, NULLIF(trim(s->>'comment'), '')
    FROM jsonb_array_elements(p_scores) s;

    UPDATE performance_evaluators
    SET status = 'DONE', submitted_at = now()
    WHERE evaluation_id = p_evaluation AND evaluator_id = v_uid;

    SELECT count(*) INTO v_pending FROM performance_evaluators
    WHERE evaluation_id = p_evaluation AND status = 'PENDING';

    IF v_pending > 0 THEN
        UPDATE performance_evaluations SET status = 'IN_PROGRESS' WHERE id = p_evaluation;
        RETURN 'IN_PROGRESS';
    END IF;

    SELECT round(sum(x.weight * x.avg_score) / sum(x.weight), 2) INTO v_final
    FROM (
        SELECT ev.weight, avg(a.score)::numeric AS avg_score
        FROM performance_evaluators ev
        JOIN performance_answers a
          ON a.evaluation_id = ev.evaluation_id AND a.evaluator_id = ev.evaluator_id
        WHERE ev.evaluation_id = p_evaluation
        GROUP BY ev.evaluator_id, ev.weight
    ) x;

    UPDATE performance_evaluations
    SET status = 'CLOSED', final_score = v_final, closed_at = now()
    WHERE id = p_evaluation;

    INSERT INTO performance_salary_recommendations (evaluation_id, tenant_id, pct, recorded_by)
    VALUES (p_evaluation, v_eval.tenant_id, annual_increase_pct(v_final), v_uid)
    ON CONFLICT (evaluation_id) DO UPDATE
        SET pct = EXCLUDED.pct, recorded_by = EXCLUDED.recorded_by, recorded_at = now();

    RETURN 'CLOSED';
END;
$$;
