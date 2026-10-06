-- El empleado ve solo el resultado consolidado (decisión del cliente): resultado de
-- período de prueba o calificación final anual. No ve criterios ni comentarios de
-- evaluadores, porque con un solo evaluador quedarían identificados.

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
            'final_score', ev.final_score,
            'acknowledged_at', ack.acknowledged_at,
            'observation', ack.observation
        ) AS r
        FROM performance_evaluations ev
        JOIN employees e ON e.id = ev.employee_id
        LEFT JOIN performance_employee_acks ack ON ack.evaluation_id = ev.id
        WHERE e.user_id = auth.uid()
          AND ev.tenant_id = get_my_tenant_id()
          AND ev.status = 'CLOSED'
    ) x;
$$;

REVOKE INSERT, UPDATE, DELETE ON performance_employee_acks FROM anon, authenticated, public;
