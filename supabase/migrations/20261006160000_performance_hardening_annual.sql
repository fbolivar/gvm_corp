-- PRP-007 hardening (revisión de seguridad de la campaña anual).
-- 1) Ningún gestor cambia estado, puntaje ni recomendación por la API: solo las funciones.
-- 2) Nadie se evalúa a sí mismo; evaluadores solo en campañas abiertas.
-- 3) Recomendación de incremento en tabla propia, visible solo a gestores.
-- 4) Envío anual: ventana de fechas (Bogotá) y bloqueo de fila contra la carrera.

-- 1 y 3: recomendación en su tabla
CREATE TABLE IF NOT EXISTS performance_salary_recommendations (
    evaluation_id  uuid PRIMARY KEY REFERENCES performance_evaluations(id) ON DELETE CASCADE,
    tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pct            numeric NOT NULL CHECK (pct BETWEEN 0 AND 100),
    recorded_by    uuid NOT NULL REFERENCES profiles(id),
    recorded_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE performance_salary_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "psr_manager_select" ON performance_salary_recommendations FOR SELECT
    USING (tenant_id = get_my_tenant_id() AND is_performance_manager());

ALTER TABLE performance_evaluations
    DROP COLUMN IF EXISTS salary_recommendation_pct,
    DROP COLUMN IF EXISTS recommendation_by,
    DROP COLUMN IF EXISTS recommendation_at;

-- 1: sin UPDATE directo sobre evaluaciones
DROP POLICY IF EXISTS "pe_manager_update" ON performance_evaluations;

-- 2: inserción de evaluación: mismo tenant y estado inicial forzado
DROP POLICY IF EXISTS "pe_manager_insert" ON performance_evaluations;
CREATE POLICY "pe_manager_insert" ON performance_evaluations FOR INSERT WITH CHECK (
    tenant_id = get_my_tenant_id()
    AND is_performance_manager()
    AND EXISTS (SELECT 1 FROM employees e WHERE e.id = employee_id AND e.tenant_id = get_my_tenant_id())
);

CREATE OR REPLACE FUNCTION guard_performance_evaluation_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.status := 'PENDING';
    NEW.probation_outcome := NULL;
    NEW.final_score := NULL;
    NEW.closed_at := NULL;
    NEW.outcome_comments := NULL;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_performance_evaluation_insert ON performance_evaluations;
CREATE TRIGGER trg_guard_performance_evaluation_insert
    BEFORE INSERT ON performance_evaluations
    FOR EACH ROW EXECUTE FUNCTION guard_performance_evaluation_insert();

-- 2 y 4: evaluadores: mismo tenant, evaluación abierta, campaña abierta, nunca el propio empleado
DROP POLICY IF EXISTS "pev_manager_insert" ON performance_evaluators;
CREATE POLICY "pev_manager_insert" ON performance_evaluators FOR INSERT WITH CHECK (
    tenant_id = get_my_tenant_id()
    AND is_performance_manager()
    AND EXISTS (SELECT 1 FROM performance_evaluations e WHERE e.id = evaluation_id AND e.tenant_id = get_my_tenant_id())
);

ALTER TABLE performance_evaluators DROP CONSTRAINT IF EXISTS performance_evaluators_weight_check;
ALTER TABLE performance_evaluators ADD CONSTRAINT performance_evaluators_weight_check
    CHECK (weight BETWEEN 0.01 AND 10);

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
    SELECT user_id INTO v_emp_user FROM employees WHERE id = e.employee_id;
    IF v_emp_user IS NOT NULL AND v_emp_user = NEW.evaluator_id THEN
        RAISE EXCEPTION 'Nadie puede evaluarse a sí mismo';
    END IF;
    NEW.status := 'PENDING';
    NEW.submitted_at := NULL;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_performance_evaluator_insert ON performance_evaluators;
CREATE TRIGGER trg_guard_performance_evaluator_insert
    BEFORE INSERT ON performance_evaluators
    FOR EACH ROW EXECUTE FUNCTION guard_performance_evaluator_insert();

-- 4: envío anual con ventana de fechas y bloqueo de fila
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

    RETURN 'CLOSED';
END;
$$;

-- 3: registrar recomendación en la tabla propia
CREATE OR REPLACE FUNCTION set_annual_recommendation(p_evaluation uuid, p_pct numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant uuid := get_my_tenant_id();
    v_emp_user uuid;
BEGIN
    IF NOT is_performance_manager() THEN RAISE EXCEPTION 'Sin permiso para registrar recomendaciones'; END IF;
    IF EXISTS (
        SELECT 1 FROM performance_evaluators
        WHERE evaluation_id = p_evaluation AND evaluator_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Quien evaluó no puede registrar la recomendación de esta evaluación';
    END IF;

    SELECT e.user_id INTO v_emp_user
    FROM performance_evaluations ev JOIN employees e ON e.id = ev.employee_id
    WHERE ev.id = p_evaluation AND ev.tenant_id = v_tenant AND ev.eval_type = 'ANNUAL' AND ev.status = 'CLOSED';
    IF NOT FOUND THEN RAISE EXCEPTION 'Evaluación no encontrada o aún no cerrada'; END IF;
    IF v_emp_user IS NOT NULL AND v_emp_user = auth.uid() THEN
        RAISE EXCEPTION 'Nadie puede registrar su propio incremento';
    END IF;

    INSERT INTO performance_salary_recommendations (evaluation_id, tenant_id, pct, recorded_by)
    VALUES (p_evaluation, v_tenant, p_pct, auth.uid())
    ON CONFLICT (evaluation_id) DO UPDATE
        SET pct = EXCLUDED.pct, recorded_by = EXCLUDED.recorded_by, recorded_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION set_annual_recommendation(uuid, numeric) FROM anon, public;
GRANT EXECUTE ON FUNCTION set_annual_recommendation(uuid, numeric) TO authenticated;
REVOKE EXECUTE ON FUNCTION submit_annual_evaluation(uuid, jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION submit_annual_evaluation(uuid, jsonb) TO authenticated;
