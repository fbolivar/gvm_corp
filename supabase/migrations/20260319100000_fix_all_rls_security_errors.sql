-- ============================================================================
-- Fix ALL Supabase security linter errors
-- Strategy: For each table, enable RLS. If it has tenant_id, use tenant
-- isolation. If not, use authenticated-only access policy.
-- ============================================================================

-- Helper: Safe policy creation using DO blocks to check for tenant_id
-- ============================================================================

-- 1. chat_channel_members (linter calls it chat_members) — NO tenant_id, uses user_id
ALTER TABLE chat_channel_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_members_auth" ON chat_channel_members;
CREATE POLICY "chat_members_auth" ON chat_channel_members FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
GRANT ALL ON chat_channel_members TO authenticated;

-- 2. support_tickets
DO $$ BEGIN
    ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_tickets' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "support_tickets_tenant" ON support_tickets;
        CREATE POLICY "support_tickets_tenant" ON support_tickets FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "support_tickets_auth" ON support_tickets;
        CREATE POLICY "support_tickets_auth" ON support_tickets FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    GRANT ALL ON support_tickets TO authenticated;
END $$;

-- 3. support_interactions
DO $$ BEGIN
    ALTER TABLE support_interactions ENABLE ROW LEVEL SECURITY;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_interactions' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "support_interactions_tenant" ON support_interactions;
        CREATE POLICY "support_interactions_tenant" ON support_interactions FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "support_interactions_auth" ON support_interactions;
        CREATE POLICY "support_interactions_auth" ON support_interactions FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    GRANT ALL ON support_interactions TO authenticated;
END $$;

-- 4. support_audit_log
DO $$ BEGIN
    ALTER TABLE support_audit_log ENABLE ROW LEVEL SECURITY;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='support_audit_log' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "support_audit_log_tenant" ON support_audit_log;
        CREATE POLICY "support_audit_log_tenant" ON support_audit_log FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "support_audit_log_auth" ON support_audit_log;
        CREATE POLICY "support_audit_log_auth" ON support_audit_log FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    GRANT ALL ON support_audit_log TO authenticated;
END $$;

-- 5. document_allocations
DO $$ BEGIN
    ALTER TABLE document_allocations ENABLE ROW LEVEL SECURITY;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='document_allocations' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "document_allocations_tenant" ON document_allocations;
        CREATE POLICY "document_allocations_tenant" ON document_allocations FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "document_allocations_auth" ON document_allocations;
        CREATE POLICY "document_allocations_auth" ON document_allocations FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    GRANT ALL ON document_allocations TO authenticated;
END $$;

-- 6. party_external_ids
DO $$ BEGIN
    ALTER TABLE party_external_ids ENABLE ROW LEVEL SECURITY;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_external_ids' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "party_external_ids_tenant" ON party_external_ids;
        CREATE POLICY "party_external_ids_tenant" ON party_external_ids FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "party_external_ids_auth" ON party_external_ids;
        CREATE POLICY "party_external_ids_auth" ON party_external_ids FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    GRANT ALL ON party_external_ids TO authenticated;
END $$;

-- 7. journal_entries
DO $$ BEGIN
    ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='journal_entries' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "journal_entries_tenant" ON journal_entries;
        CREATE POLICY "journal_entries_tenant" ON journal_entries FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "journal_entries_auth" ON journal_entries;
        CREATE POLICY "journal_entries_auth" ON journal_entries FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    GRANT ALL ON journal_entries TO authenticated;
END $$;

-- 8. journal_lines
DO $$ BEGIN
    ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='journal_lines' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "journal_lines_tenant" ON journal_lines;
        CREATE POLICY "journal_lines_tenant" ON journal_lines FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "journal_lines_auth" ON journal_lines;
        CREATE POLICY "journal_lines_auth" ON journal_lines FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    GRANT ALL ON journal_lines TO authenticated;
END $$;

-- 9. payroll_benefits
DO $$ BEGIN
    ALTER TABLE payroll_benefits ENABLE ROW LEVEL SECURITY;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payroll_benefits' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "payroll_benefits_tenant" ON payroll_benefits;
        CREATE POLICY "payroll_benefits_tenant" ON payroll_benefits FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "payroll_benefits_auth" ON payroll_benefits;
        CREATE POLICY "payroll_benefits_auth" ON payroll_benefits FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    GRANT ALL ON payroll_benefits TO authenticated;
END $$;

-- 10. payroll_loans
DO $$ BEGIN
    ALTER TABLE payroll_loans ENABLE ROW LEVEL SECURITY;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payroll_loans' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "payroll_loans_tenant" ON payroll_loans;
        CREATE POLICY "payroll_loans_tenant" ON payroll_loans FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "payroll_loans_auth" ON payroll_loans;
        CREATE POLICY "payroll_loans_auth" ON payroll_loans FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    GRANT ALL ON payroll_loans TO authenticated;
END $$;

-- 11. payroll_periods
DO $$ BEGIN
    ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payroll_periods' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "payroll_periods_tenant" ON payroll_periods;
        CREATE POLICY "payroll_periods_tenant" ON payroll_periods FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "payroll_periods_auth" ON payroll_periods;
        CREATE POLICY "payroll_periods_auth" ON payroll_periods FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    GRANT ALL ON payroll_periods TO authenticated;
END $$;

-- 12. warehouses
DO $$ BEGIN
    ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='warehouses' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "warehouses_tenant" ON warehouses;
        CREATE POLICY "warehouses_tenant" ON warehouses FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "warehouses_auth" ON warehouses;
        CREATE POLICY "warehouses_auth" ON warehouses FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    GRANT ALL ON warehouses TO authenticated;
END $$;

-- 13. treasury_accounts (SENSITIVE — account_number exposed)
DO $$ BEGIN
    ALTER TABLE treasury_accounts ENABLE ROW LEVEL SECURITY;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='treasury_accounts' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "treasury_accounts_tenant" ON treasury_accounts;
        CREATE POLICY "treasury_accounts_tenant" ON treasury_accounts FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "treasury_accounts_auth" ON treasury_accounts;
        CREATE POLICY "treasury_accounts_auth" ON treasury_accounts FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    GRANT ALL ON treasury_accounts TO authenticated;
END $$;

-- 14. chart_accounts
DO $$ BEGIN
    ALTER TABLE chart_accounts ENABLE ROW LEVEL SECURITY;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chart_accounts' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "chart_accounts_tenant" ON chart_accounts;
        CREATE POLICY "chart_accounts_tenant" ON chart_accounts FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "chart_accounts_auth" ON chart_accounts;
        CREATE POLICY "chart_accounts_auth" ON chart_accounts FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    GRANT ALL ON chart_accounts TO authenticated;
END $$;

-- 15. employees
DO $$ BEGIN
    ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "employees_tenant" ON employees;
        CREATE POLICY "employees_tenant" ON employees FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "employees_auth" ON employees;
        CREATE POLICY "employees_auth" ON employees FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    GRANT ALL ON employees TO authenticated;
END $$;

-- 16. production_recipes
DO $$ BEGIN
    ALTER TABLE production_recipes ENABLE ROW LEVEL SECURITY;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='production_recipes' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "production_recipes_tenant" ON production_recipes;
        CREATE POLICY "production_recipes_tenant" ON production_recipes FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "production_recipes_auth" ON production_recipes;
        CREATE POLICY "production_recipes_auth" ON production_recipes FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    GRANT ALL ON production_recipes TO authenticated;
END $$;

-- 17. production_recipe_items
DO $$ BEGIN
    ALTER TABLE production_recipe_items ENABLE ROW LEVEL SECURITY;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='production_recipe_items' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "production_recipe_items_tenant" ON production_recipe_items;
        CREATE POLICY "production_recipe_items_tenant" ON production_recipe_items FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "production_recipe_items_auth" ON production_recipe_items;
        CREATE POLICY "production_recipe_items_auth" ON production_recipe_items FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    GRANT ALL ON production_recipe_items TO authenticated;
END $$;

-- 18. production_orders
DO $$ BEGIN
    ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='production_orders' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "production_orders_tenant" ON production_orders;
        CREATE POLICY "production_orders_tenant" ON production_orders FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "production_orders_auth" ON production_orders;
        CREATE POLICY "production_orders_auth" ON production_orders FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    GRANT ALL ON production_orders TO authenticated;
END $$;

-- 19. currencies — confirmed NO tenant_id in migration
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation" ON currencies;
DROP POLICY IF EXISTS "currencies_auth" ON currencies;
CREATE POLICY "currencies_auth" ON currencies FOR ALL
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
GRANT ALL ON currencies TO authenticated;

-- 20. payment_allocations (had policy_exists_rls_disabled with "Global Access")
DO $$ BEGIN
    ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Global Access" ON payment_allocations;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_allocations' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "payment_allocations_tenant" ON payment_allocations;
        CREATE POLICY "payment_allocations_tenant" ON payment_allocations FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "payment_allocations_auth" ON payment_allocations;
        CREATE POLICY "payment_allocations_auth" ON payment_allocations FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    GRANT ALL ON payment_allocations TO authenticated;
END $$;

-- 21. collection_actions (had policy_exists_rls_disabled with "Global Access")
DO $$ BEGIN
    ALTER TABLE collection_actions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Global Access" ON collection_actions;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='collection_actions' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "collection_actions_tenant" ON collection_actions;
        CREATE POLICY "collection_actions_tenant" ON collection_actions FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "collection_actions_auth" ON collection_actions;
        CREATE POLICY "collection_actions_auth" ON collection_actions FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    GRANT ALL ON collection_actions TO authenticated;
END $$;

-- 22. collection_agent_config (had policy_exists_rls_disabled with "Global Access")
DO $$ BEGIN
    ALTER TABLE collection_agent_config ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Global Access" ON collection_agent_config;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='collection_agent_config' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "collection_agent_config_tenant" ON collection_agent_config;
        CREATE POLICY "collection_agent_config_tenant" ON collection_agent_config FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "collection_agent_config_auth" ON collection_agent_config;
        CREATE POLICY "collection_agent_config_auth" ON collection_agent_config FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    GRANT ALL ON collection_agent_config TO authenticated;
END $$;

-- 23. debtor_profiles (had policy_exists_rls_disabled with "Global Access")
DO $$ BEGIN
    ALTER TABLE debtor_profiles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Global Access" ON debtor_profiles;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='debtor_profiles' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "debtor_profiles_tenant" ON debtor_profiles;
        CREATE POLICY "debtor_profiles_tenant" ON debtor_profiles FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "debtor_profiles_auth" ON debtor_profiles;
        CREATE POLICY "debtor_profiles_auth" ON debtor_profiles FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
    GRANT ALL ON debtor_profiles TO authenticated;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2: Fix product_stock SECURITY DEFINER view → SECURITY INVOKER
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    view_def TEXT;
BEGIN
    SELECT pg_get_viewdef('public.product_stock', true) INTO view_def;
    IF view_def IS NOT NULL THEN
        DROP VIEW IF EXISTS public.product_stock;
        EXECUTE 'CREATE VIEW public.product_stock AS ' || view_def;
        ALTER VIEW public.product_stock SET (security_invoker = true);
        GRANT SELECT ON public.product_stock TO authenticated;
    END IF;
END $$;
