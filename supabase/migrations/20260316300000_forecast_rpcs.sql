-- =============================================
-- Sales Forecast RPCs
-- 2026-03-16
-- =============================================

-- 1. Forecast by month: groups open opportunities by expected_close_date month
CREATE OR REPLACE FUNCTION get_forecast_by_month(p_months INT DEFAULT 6)
RETURNS TABLE (
    month       DATE,
    opp_count   BIGINT,
    nominal     NUMERIC,
    weighted    NUMERIC,
    commit_val  NUMERIC,
    best_case   NUMERIC,
    pipeline_val NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        DATE_TRUNC('month', o.expected_close_date)::DATE AS month,
        COUNT(*)::BIGINT AS opp_count,
        COALESCE(SUM(o.value), 0) AS nominal,
        COALESCE(SUM(o.value * o.probability / 100), 0) AS weighted,
        COALESCE(SUM(CASE WHEN o.probability >= 90 THEN o.value * o.probability / 100 ELSE 0 END), 0) AS commit_val,
        COALESCE(SUM(CASE WHEN o.probability >= 50 AND o.probability < 90 THEN o.value * o.probability / 100 ELSE 0 END), 0) AS best_case,
        COALESCE(SUM(CASE WHEN o.probability < 50 THEN o.value * o.probability / 100 ELSE 0 END), 0) AS pipeline_val
    FROM crm_opportunities o
    WHERE o.tenant_id = get_my_tenant_id()
      AND o.stage NOT IN ('CLOSED_WON', 'CLOSED_LOST')
      AND o.expected_close_date IS NOT NULL
      AND o.expected_close_date >= DATE_TRUNC('month', CURRENT_DATE)
      AND o.expected_close_date < DATE_TRUNC('month', CURRENT_DATE) + (p_months || ' months')::INTERVAL
    GROUP BY DATE_TRUNC('month', o.expected_close_date)
    ORDER BY month;
END;
$$;

-- 2. Forecast by assignee: groups open opportunities by assigned user
CREATE OR REPLACE FUNCTION get_forecast_by_assignee()
RETURNS TABLE (
    user_id     UUID,
    full_name   TEXT,
    opp_count   BIGINT,
    nominal     NUMERIC,
    weighted    NUMERIC,
    commit_val  NUMERIC,
    best_case   NUMERIC,
    pipeline_val NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.assigned_to AS user_id,
        COALESCE(p.full_name, p.email, 'Sin asignar') AS full_name,
        COUNT(*)::BIGINT AS opp_count,
        COALESCE(SUM(o.value), 0) AS nominal,
        COALESCE(SUM(o.value * o.probability / 100), 0) AS weighted,
        COALESCE(SUM(CASE WHEN o.probability >= 90 THEN o.value * o.probability / 100 ELSE 0 END), 0) AS commit_val,
        COALESCE(SUM(CASE WHEN o.probability >= 50 AND o.probability < 90 THEN o.value * o.probability / 100 ELSE 0 END), 0) AS best_case,
        COALESCE(SUM(CASE WHEN o.probability < 50 THEN o.value * o.probability / 100 ELSE 0 END), 0) AS pipeline_val
    FROM crm_opportunities o
    LEFT JOIN profiles p ON p.id = o.assigned_to
    WHERE o.tenant_id = get_my_tenant_id()
      AND o.stage NOT IN ('CLOSED_WON', 'CLOSED_LOST')
    GROUP BY o.assigned_to, p.full_name, p.email
    ORDER BY weighted DESC;
END;
$$;
