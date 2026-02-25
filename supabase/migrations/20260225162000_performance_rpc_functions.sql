-- ==========================================
-- SAAS FACTORY V3 - SERVER-SIDE AGGREGATION
-- ==========================================
-- Move heavy calculations from JS to PostgreSQL
-- for reduced latency at 100+ concurrent connections.
-- Instead of SELECT * + JS reduce(), we use COUNT/SUM at DB level.

-- 1. Dashboard Liquidity Summary (replaces fetching ALL documents)
CREATE OR REPLACE FUNCTION get_treasury_summary(p_tenant_id UUID DEFAULT NULL)
RETURNS TABLE (
    total_liquidity NUMERIC,
    total_ar NUMERIC,
    total_ap NUMERIC,
    ar_count BIGINT,
    ap_count BIGINT,
    overdue_ar NUMERIC,
    overdue_ap NUMERIC,
    projected_balance NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Resolve tenant
    v_tenant_id := COALESCE(p_tenant_id, (SELECT id FROM tenants LIMIT 1));
    
    RETURN QUERY
    SELECT
        COALESCE((SELECT SUM(ta.balance) FROM treasury_accounts ta WHERE ta.tenant_id = v_tenant_id), 0) AS total_liquidity,
        COALESCE((SELECT SUM(d.balance) FROM documents d WHERE d.tenant_id = v_tenant_id AND d.doc_type = 'INVOICE' AND d.status != 'SENT'), 0) AS total_ar,
        COALESCE((SELECT SUM(d.balance) FROM documents d WHERE d.tenant_id = v_tenant_id AND d.doc_type = 'VENDOR_BILL' AND d.status != 'SENT'), 0) AS total_ap,
        COALESCE((SELECT COUNT(*) FROM documents d WHERE d.tenant_id = v_tenant_id AND d.doc_type = 'INVOICE' AND d.status != 'SENT'), 0) AS ar_count,
        COALESCE((SELECT COUNT(*) FROM documents d WHERE d.tenant_id = v_tenant_id AND d.doc_type = 'VENDOR_BILL' AND d.status != 'SENT'), 0) AS ap_count,
        COALESCE((SELECT SUM(d.balance) FROM documents d WHERE d.tenant_id = v_tenant_id AND d.doc_type = 'INVOICE' AND d.status != 'SENT' AND d.due_date < CURRENT_DATE), 0) AS overdue_ar,
        COALESCE((SELECT SUM(d.balance) FROM documents d WHERE d.tenant_id = v_tenant_id AND d.doc_type = 'VENDOR_BILL' AND d.status != 'SENT' AND d.due_date < CURRENT_DATE), 0) AS overdue_ap,
        (
            COALESCE((SELECT SUM(ta.balance) FROM treasury_accounts ta WHERE ta.tenant_id = v_tenant_id), 0)
            + COALESCE((SELECT SUM(d.balance) FROM documents d WHERE d.tenant_id = v_tenant_id AND d.doc_type = 'INVOICE' AND d.status != 'SENT'), 0)
            - COALESCE((SELECT SUM(d.balance) FROM documents d WHERE d.tenant_id = v_tenant_id AND d.doc_type = 'VENDOR_BILL' AND d.status != 'SENT'), 0)
        ) AS projected_balance;
END;
$$;

-- 2. Account Balance Summary (avoids SELECT * on treasury_accounts)
CREATE OR REPLACE FUNCTION get_account_balances(p_tenant_id UUID DEFAULT NULL)
RETURNS TABLE (
    account_id UUID,
    account_name TEXT,
    account_type TEXT,
    bank_name TEXT,
    balance NUMERIC,
    transaction_count BIGINT,
    last_movement TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    v_tenant_id := COALESCE(p_tenant_id, (SELECT id FROM tenants LIMIT 1));
    
    RETURN QUERY
    SELECT
        ta.id AS account_id,
        ta.name::TEXT AS account_name,
        ta.type::TEXT AS account_type,
        ta.bank_name::TEXT AS bank_name,
        ta.balance AS balance,
        COALESCE((SELECT COUNT(*) FROM treasury_transactions tt WHERE tt.account_id = ta.id), 0) AS transaction_count,
        (SELECT MAX(tt.created_at) FROM treasury_transactions tt WHERE tt.account_id = ta.id) AS last_movement
    FROM treasury_accounts ta
    WHERE ta.tenant_id = v_tenant_id
    ORDER BY ta.name;
END;
$$;

-- 3. Cartera Aging Summary (for dashboard KPIs without fetching all documents)
CREATE OR REPLACE FUNCTION get_cartera_aging(p_tenant_id UUID DEFAULT NULL, p_type TEXT DEFAULT 'RECEIVABLES')
RETURNS TABLE (
    current_amount NUMERIC,
    days_1_15 NUMERIC,
    days_16_30 NUMERIC,
    days_31_60 NUMERIC,
    days_61_plus NUMERIC,
    total_amount NUMERIC,
    document_count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_tenant_id UUID;
    v_doc_type TEXT;
BEGIN
    v_tenant_id := COALESCE(p_tenant_id, (SELECT id FROM tenants LIMIT 1));
    v_doc_type := CASE WHEN p_type = 'RECEIVABLES' THEN 'INVOICE' ELSE 'VENDOR_BILL' END;
    
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN d.due_date >= CURRENT_DATE THEN d.balance ELSE 0 END), 0) AS current_amount,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - d.due_date BETWEEN 1 AND 15 THEN d.balance ELSE 0 END), 0) AS days_1_15,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - d.due_date BETWEEN 16 AND 30 THEN d.balance ELSE 0 END), 0) AS days_16_30,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - d.due_date BETWEEN 31 AND 60 THEN d.balance ELSE 0 END), 0) AS days_31_60,
        COALESCE(SUM(CASE WHEN CURRENT_DATE - d.due_date > 60 THEN d.balance ELSE 0 END), 0) AS days_61_plus,
        COALESCE(SUM(d.balance), 0) AS total_amount,
        COUNT(*) AS document_count
    FROM documents d
    WHERE d.tenant_id = v_tenant_id
    AND d.doc_type = v_doc_type
    AND d.status != 'SENT';
END;
$$;
