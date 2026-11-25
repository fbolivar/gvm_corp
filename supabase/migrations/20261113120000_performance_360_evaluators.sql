-- Evaluación de desempeño 360°: cualquier miembro activo del tenant puede ser designado
-- evaluador de una campaña anual, sin importar su rol ni su permiso del módulo.
--
-- Cambio: `submit_annual_evaluation` ya NO exige que quien califica tenga el módulo
-- payroll:performance (is_performance_manager OR role_permissions.can_edit). La autorización
-- real para calificar la da estar ASIGNADO como evaluador PENDING de esa evaluación (chequeo
-- que se conserva). Un empleado designado como evaluador envía su calificación aunque no
-- tenga acceso al módulo. Todo lo demás (ventana de campaña, criterios exigidos, cálculo del
-- promedio ponderado por el peso de cada evaluador, cierre) queda idéntico.
--
-- La designación de evaluadores y las recomendaciones de incremento SIGUEN siendo de gerencia
-- (open/close campaña y set_annual_recommendation conservan is_performance_manager()).

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

    -- Única autorización para calificar (360°): estar asignado como evaluador PENDIENTE.
    IF NOT EXISTS (
        SELECT 1 FROM performance_evaluators
        WHERE evaluation_id = p_evaluation AND evaluator_id = v_uid AND status = 'PENDING'
    ) THEN
        RAISE EXCEPTION 'No estás asignado como evaluador pendiente de esta evaluación';
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

    RETURN 'CLOSED';
END;
$$;

REVOKE EXECUTE ON FUNCTION submit_annual_evaluation(uuid, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION submit_annual_evaluation(uuid, jsonb) TO authenticated;

-- Refuerzo (defensa en profundidad): al asignar un evaluador, exigir que pertenezca al
-- tenant de la evaluación. La Server Action ya lo valida, pero la RLS de INSERT solo pide
-- is_performance_manager(); sin esto, un gerente podría asignar por PostgREST el uuid de un
-- usuario de OTRO tenant (oráculo de existencia cross-tenant). Mismo patrón ya cerrado en
-- crm_interactions / vendor-surveys: una FK no respeta RLS y un uuid no es autorización.
CREATE OR REPLACE FUNCTION guard_performance_evaluator_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    e performance_evaluations%ROWTYPE;
    v_emp_user uuid;
BEGIN
    SELECT * INTO e FROM performance_evaluations WHERE id = NEW.evaluation_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Evaluación no encontrada'; END IF;
    IF e.status = 'CLOSED' THEN RAISE EXCEPTION 'La evaluación ya está cerrada'; END IF;
    IF e.campaign_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM performance_campaigns c WHERE c.id = e.campaign_id AND c.status = 'OPEN'
    ) THEN
        RAISE EXCEPTION 'La campaña no está abierta';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM user_tenants ut
        WHERE ut.user_id = NEW.evaluator_id AND ut.tenant_id = e.tenant_id AND ut.status = 'active'
    ) THEN
        RAISE EXCEPTION 'El evaluador no pertenece a la empresa de la evaluación';
    END IF;
    SELECT user_id INTO v_emp_user FROM employees WHERE id = e.employee_id;
    IF v_emp_user IS NOT NULL AND v_emp_user = NEW.evaluator_id THEN
        RAISE EXCEPTION 'Nadie puede evaluarse a sí mismo';
    END IF;
    NEW.status := 'PENDING';
    NEW.submitted_at := NULL;
    RETURN NEW;
END;
$$;
