-- PRP-007 Fase 4: el empleado consulta SU resultado consolidado, cuando todos sus
-- evaluadores terminaron. No ve recomendaciones, aprobaciones ni evaluadores.

CREATE TABLE IF NOT EXISTS performance_employee_acks (
    evaluation_id    uuid PRIMARY KEY REFERENCES performance_evaluations(id) ON DELETE CASCADE,
    tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id      uuid NOT NULL REFERENCES employees(id),
    observation      text CHECK (observation IS NULL OR char_length(observation) <= 2000),
    acknowledged_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE performance_employee_acks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pea_own_select" ON performance_employee_acks FOR SELECT USING (
    tenant_id = get_my_tenant_id()
    AND (is_performance_manager() OR employee_id IN (
        SELECT e.id FROM employees e WHERE e.user_id = auth.uid()
    ))
);

CREATE OR REPLACE FUNCTION my_performance_results()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(jsonb_agg(r ORDER BY r->>'closed_at' DESC), '[]'::jsonb)
    FROM (
        SELECT jsonb_build_object(
            'id', ev.id,
            'eval_type', ev.eval_type,
            'due_date', ev.due_date,
            'closed_at', ev.closed_at,
            'probation_outcome', ev.probation_outcome,
            'outcome_comments', ev.outcome_comments,
            'final_score', ev.final_score,
            'acknowledged_at', ack.acknowledged_at,
            'observation', ack.observation,
            'criteria', COALESCE((
                SELECT jsonb_agg(jsonb_build_object(
                    'criterion', t.criterion,
                    'kind', t.kind,
                    'avg', t.avg_score
                ) ORDER BY t.sort_order)
                FROM (
                    SELECT c.criterion, c.kind, c.sort_order,
                           round(avg(a.score)::numeric, 2) AS avg_score
                    FROM performance_criteria c
                    JOIN performance_answers a ON a.criterion_id = c.id AND a.evaluation_id = ev.id
                    GROUP BY c.id, c.criterion, c.kind, c.sort_order
                ) t
            ), '[]'::jsonb),
            'comments', COALESCE((
                SELECT jsonb_agg(a.comment ORDER BY a.created_at)
                FROM performance_answers a
                WHERE a.evaluation_id = ev.id AND a.comment IS NOT NULL
            ), '[]'::jsonb)
        ) AS r
        FROM performance_evaluations ev
        JOIN employees e ON e.id = ev.employee_id
        LEFT JOIN performance_employee_acks ack ON ack.evaluation_id = ev.id
        WHERE e.user_id = auth.uid()
          AND ev.tenant_id = get_my_tenant_id()
          AND ev.status = 'CLOSED'
    ) x;
$$;

CREATE OR REPLACE FUNCTION acknowledge_performance_result(p_evaluation uuid, p_observation text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_emp employees%ROWTYPE;
    v_ev performance_evaluations%ROWTYPE;
BEGIN
    SELECT * INTO v_emp FROM employees WHERE user_id = auth.uid() AND tenant_id = get_my_tenant_id();
    IF NOT FOUND THEN RAISE EXCEPTION 'Tu usuario no está vinculado a una ficha de empleado'; END IF;

    SELECT * INTO v_ev FROM performance_evaluations
    WHERE id = p_evaluation AND employee_id = v_emp.id AND tenant_id = v_emp.tenant_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Evaluación no encontrada'; END IF;
    IF v_ev.status <> 'CLOSED' THEN RAISE EXCEPTION 'El resultado aún no está disponible'; END IF;

    IF EXISTS (SELECT 1 FROM performance_employee_acks WHERE evaluation_id = p_evaluation) THEN
        RAISE EXCEPTION 'Ya registraste que conociste este resultado';
    END IF;

    INSERT INTO performance_employee_acks (evaluation_id, tenant_id, employee_id, observation)
    VALUES (p_evaluation, v_emp.tenant_id, v_emp.id, NULLIF(trim(coalesce(p_observation, '')), ''));
END;
$$;

REVOKE EXECUTE ON FUNCTION my_performance_results() FROM anon, public;
REVOKE EXECUTE ON FUNCTION acknowledge_performance_result(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION my_performance_results() TO authenticated;
GRANT EXECUTE ON FUNCTION acknowledge_performance_result(uuid, text) TO authenticated;
