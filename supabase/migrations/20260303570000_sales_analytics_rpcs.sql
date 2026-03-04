-- ============================================================================
-- RPCs for Sales Analytics page
-- Problem: page used non-existent execute_sql_internal RPC
-- Fix: Create dedicated SECURITY DEFINER functions for each query
-- ============================================================================

-- 1. Monthly sales aggregation (current + previous year)
CREATE OR REPLACE FUNCTION get_monthly_sales()
RETURNS TABLE (
    month TEXT,
    total FLOAT,
    count INT,
    year INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        to_char(date_trunc('month', d.issue_date), 'YYYY-MM-DD') AS month,
        SUM(d.total)::float AS total,
        COUNT(*)::int AS count,
        EXTRACT(YEAR FROM d.issue_date)::int AS year
    FROM documents d
    WHERE d.doc_type = 'INVOICE'
      AND d.status != 'VOIDED'
      AND d.tenant_id = get_my_tenant_id()
      AND EXTRACT(YEAR FROM d.issue_date) IN (
          EXTRACT(YEAR FROM NOW()),
          EXTRACT(YEAR FROM NOW()) - 1
      )
    GROUP BY date_trunc('month', d.issue_date), EXTRACT(YEAR FROM d.issue_date)
    ORDER BY date_trunc('month', d.issue_date);
END;
$$;

GRANT EXECUTE ON FUNCTION get_monthly_sales() TO authenticated, service_role;

-- 2. Top clients by invoice total (current year)
CREATE OR REPLACE FUNCTION get_top_clients(p_limit INT DEFAULT 10)
RETURNS TABLE (
    legal_name TEXT,
    total FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.legal_name,
        SUM(d.total)::float AS total
    FROM documents d
    JOIN parties p ON d.party_id = p.id
    WHERE d.doc_type = 'INVOICE'
      AND d.status != 'VOIDED'
      AND d.tenant_id = get_my_tenant_id()
      AND EXTRACT(YEAR FROM d.issue_date) = EXTRACT(YEAR FROM NOW())
    GROUP BY p.legal_name
    ORDER BY total DESC
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_top_clients(INT) TO authenticated, service_role;
