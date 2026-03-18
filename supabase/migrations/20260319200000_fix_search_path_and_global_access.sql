-- ============================================================================
-- Fix ALL remaining Supabase security warnings
-- 1. Set search_path on functions with mutable search_path
-- 2. Replace "Global Access" (USING true) policies with tenant isolation
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1: Fix function search_path dynamically
-- Queries pg_proc to find exact signatures and ALTERs them safely
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    func_names TEXT[] := ARRAY[
        'update_overtime_updated_at',
        'update_budget_updated_at',
        'set_contracts_updated_at',
        'update_petty_cash_funds_updated_at',
        'generate_it_asset_code',
        'update_it_updated_at',
        'update_crm_updated_at',
        'get_expiring_lots',
        'get_lot_summary',
        'generate_transfer_number',
        'trg_set_transfer_number',
        'trg_transfers_updated_at',
        'adjust_lot_on_movement',
        'generate_document_number',
        'set_document_number',
        'trg_set_updated_at',
        'get_products_with_stock',
        'fn_audit_log',
        'get_current_tenant_id',
        'perform_global_search',
        'get_inventory_valuation'
    ];
    fn TEXT;
    oid_val OID;
    identity_args TEXT;
BEGIN
    FOREACH fn IN ARRAY func_names LOOP
        -- Find all overloads of this function in the public schema
        FOR oid_val, identity_args IN
            SELECT p.oid, pg_get_function_identity_arguments(p.oid)
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public'
              AND p.proname = fn
        LOOP
            BEGIN
                EXECUTE format(
                    'ALTER FUNCTION public.%I(%s) SET search_path = public',
                    fn, identity_args
                );
                RAISE NOTICE 'Fixed search_path for public.%(%)', fn, identity_args;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not fix %.%: %', fn, identity_args, SQLERRM;
            END;
        END LOOP;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2: Replace "Global Access" (USING true) policies with proper ones
-- ═══════════════════════════════════════════════════════════════════════════

-- app_notifications
DO $$ BEGIN
    DROP POLICY IF EXISTS "Global Access" ON app_notifications;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_notifications' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "app_notifications_tenant" ON app_notifications;
        CREATE POLICY "app_notifications_tenant" ON app_notifications FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "app_notifications_auth" ON app_notifications;
        CREATE POLICY "app_notifications_auth" ON app_notifications FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- crm_opportunities
DO $$ BEGIN
    DROP POLICY IF EXISTS "Global Access" ON crm_opportunities;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_opportunities' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "crm_opportunities_tenant" ON crm_opportunities;
        CREATE POLICY "crm_opportunities_tenant" ON crm_opportunities FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "crm_opportunities_auth" ON crm_opportunities;
        CREATE POLICY "crm_opportunities_auth" ON crm_opportunities FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- leads
DO $$ BEGIN
    DROP POLICY IF EXISTS "Global Access" ON leads;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "leads_tenant" ON leads;
        CREATE POLICY "leads_tenant" ON leads FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "leads_auth" ON leads;
        CREATE POLICY "leads_auth" ON leads FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- logistics_carriers
DO $$ BEGIN
    DROP POLICY IF EXISTS "Global Access" ON logistics_carriers;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logistics_carriers' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "logistics_carriers_tenant" ON logistics_carriers;
        CREATE POLICY "logistics_carriers_tenant" ON logistics_carriers FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "logistics_carriers_auth" ON logistics_carriers;
        CREATE POLICY "logistics_carriers_auth" ON logistics_carriers FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- logistics_shipment_items
DO $$ BEGIN
    DROP POLICY IF EXISTS "Global Access" ON logistics_shipment_items;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logistics_shipment_items' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "logistics_shipment_items_tenant" ON logistics_shipment_items;
        CREATE POLICY "logistics_shipment_items_tenant" ON logistics_shipment_items FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "logistics_shipment_items_auth" ON logistics_shipment_items;
        CREATE POLICY "logistics_shipment_items_auth" ON logistics_shipment_items FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- logistics_shipments
DO $$ BEGIN
    DROP POLICY IF EXISTS "Global Access" ON logistics_shipments;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logistics_shipments' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "logistics_shipments_tenant" ON logistics_shipments;
        CREATE POLICY "logistics_shipments_tenant" ON logistics_shipments FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "logistics_shipments_auth" ON logistics_shipments;
        CREATE POLICY "logistics_shipments_auth" ON logistics_shipments FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- payment_reports — remove ALL permissive policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Global Access" ON payment_reports;
    DROP POLICY IF EXISTS "Public Insert" ON payment_reports;
    DROP POLICY IF EXISTS "payment_reports_public_insert" ON payment_reports;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_reports' AND column_name='tenant_id') THEN
        DROP POLICY IF EXISTS "payment_reports_tenant" ON payment_reports;
        CREATE POLICY "payment_reports_tenant" ON payment_reports FOR ALL
            USING (tenant_id = get_my_tenant_id()) WITH CHECK (tenant_id = get_my_tenant_id());
    ELSE
        DROP POLICY IF EXISTS "payment_reports_auth" ON payment_reports;
        CREATE POLICY "payment_reports_auth" ON payment_reports FOR ALL
            USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;
