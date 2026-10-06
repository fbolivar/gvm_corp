-- PRP-007 Fase 3: campaña anual con ventana fija, evaluadores con peso,
-- calificación final ponderada y recomendación de incremento (sin tocar salario).

CREATE TABLE IF NOT EXISTS performance_campaigns (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        text NOT NULL,
    opens_on    date NOT NULL,
    closes_on   date NOT NULL,
    status      text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    created_by  uuid REFERENCES profiles(id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    CHECK (closes_on >= opens_on)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_performance_campaign_open
    ON performance_campaigns (tenant_id) WHERE status = 'OPEN';

ALTER TABLE performance_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pc_campaign_select" ON performance_campaigns FOR SELECT USING (tenant_id = get_my_tenant_id());

ALTER TABLE performance_evaluations
    ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES performance_campaigns(id),
    ADD COLUMN IF NOT EXISTS final_score numeric,
    ADD COLUMN IF NOT EXISTS salary_recommendation_pct numeric
        CHECK (salary_recommendation_pct IS NULL OR salary_recommendation_pct BETWEEN 0 AND 100),
    ADD COLUMN IF NOT EXISTS recommendation_by uuid REFERENCES profiles(id),
    ADD COLUMN IF NOT EXISTS recommendation_at timestamptz,
    ADD COLUMN IF NOT EXISTS closed_at timestamptz;

ALTER TABLE performance_evaluations DROP CONSTRAINT IF EXISTS performance_evaluations_check;
ALTER TABLE performance_evaluations ADD CONSTRAINT performance_evaluations_state_check CHECK (
    (eval_type = 'PROBATION' AND campaign_id IS NULL
        AND (probation_outcome IS NULL) = (status <> 'CLOSED'))
    OR
    (eval_type = 'ANNUAL' AND campaign_id IS NOT NULL AND probation_outcome IS NULL
        AND (final_score IS NULL) = (status <> 'CLOSED'))
);
ALTER TABLE performance_evaluations ADD CONSTRAINT uq_performance_annual_campaign_employee
    UNIQUE (campaign_id, employee_id);

-- Abre la campaña y crea una evaluación anual por empleado activo con cargo asignado
CREATE OR REPLACE FUNCTION open_annual_campaign(p_name text, p_opens date, p_closes date)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant uuid := get_my_tenant_id();
    v_campaign uuid;
    v_count int;
BEGIN
    IF NOT is_performance_manager() THEN RAISE EXCEPTION 'Sin permiso para abrir la campaña'; END IF;
    IF p_closes < p_opens THEN RAISE EXCEPTION 'La fecha de cierre es anterior a la de apertura'; END IF;
    IF trim(coalesce(p_name, '')) = '' THEN RAISE EXCEPTION 'Nombre de campaña requerido'; END IF;

    INSERT INTO performance_campaigns (tenant_id, name, opens_on, closes_on, created_by)
    VALUES (v_tenant, trim(p_name), p_opens, p_closes, auth.uid())
    RETURNING id INTO v_campaign;

    INSERT INTO performance_evaluations (tenant_id, employee_id, eval_type, campaign_id, role_id_snapshot, status, due_date, created_by)
    SELECT v_tenant, e.id, 'ANNUAL', v_campaign, ut.role_id, 'PENDING', p_closes, auth.uid()
    FROM employees e
    JOIN user_tenants ut ON ut.user_id = e.user_id AND ut.tenant_id = v_tenant
    WHERE e.tenant_id = v_tenant AND e.status = 'ACTIVE' AND ut.role_id IS NOT NULL;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION close_annual_campaign(p_campaign uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT is_performance_manager() THEN RAISE EXCEPTION 'Sin permiso para cerrar la campaña'; END IF;
    UPDATE performance_campaigns SET status = 'CLOSED'
    WHERE id = p_campaign AND tenant_id = get_my_tenant_id() AND status = 'OPEN';
    IF NOT FOUND THEN RAISE EXCEPTION 'Campaña no encontrada o ya cerrada'; END IF;
END;
$$;

-- Envío de un evaluador. Cuando el último evaluador termina, la evaluación se cierra
-- y calcula la calificación final: promedio ponderado por el peso de cada evaluador.
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
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
    IF jsonb_typeof(p_scores) <> 'array' THEN RAISE EXCEPTION 'Calificaciones inválidas'; END IF;

    SELECT * INTO v_eval FROM performance_evaluations
    WHERE id = p_evaluation AND tenant_id = get_my_tenant_id();
    IF NOT FOUND THEN RAISE EXCEPTION 'Evaluación no encontrada'; END IF;
    IF v_eval.eval_type <> 'ANNUAL' THEN RAISE EXCEPTION 'Tipo de evaluación no soportado'; END IF;
    IF v_eval.status = 'CLOSED' THEN RAISE EXCEPTION 'Esta evaluación ya está cerrada'; END IF;
    IF NOT EXISTS (
        SELECT 1 FROM performance_campaigns c WHERE c.id = v_eval.campaign_id AND c.status = 'OPEN'
    ) THEN
        RAISE EXCEPTION 'La campaña no está abierta';
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

-- Recomendación de incremento: solo registra el porcentaje; no modifica employees.salary.
-- Quien evaluó a la persona no puede registrar la recomendación de esa misma evaluación.
CREATE OR REPLACE FUNCTION set_annual_recommendation(p_evaluation uuid, p_pct numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT is_performance_manager() THEN RAISE EXCEPTION 'Sin permiso para registrar recomendaciones'; END IF;
    IF EXISTS (
        SELECT 1 FROM performance_evaluators
        WHERE evaluation_id = p_evaluation AND evaluator_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Quien evaluó no puede registrar la recomendación de esta evaluación';
    END IF;
    UPDATE performance_evaluations
    SET salary_recommendation_pct = p_pct, recommendation_by = auth.uid(), recommendation_at = now()
    WHERE id = p_evaluation AND tenant_id = get_my_tenant_id()
      AND eval_type = 'ANNUAL' AND status = 'CLOSED';
    IF NOT FOUND THEN RAISE EXCEPTION 'Evaluación no encontrada o aún no cerrada'; END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION open_annual_campaign(text, date, date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION close_annual_campaign(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION submit_annual_evaluation(uuid, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION set_annual_recommendation(uuid, numeric) FROM anon, public;
GRANT EXECUTE ON FUNCTION open_annual_campaign(text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION close_annual_campaign(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_annual_evaluation(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION set_annual_recommendation(uuid, numeric) TO authenticated;
