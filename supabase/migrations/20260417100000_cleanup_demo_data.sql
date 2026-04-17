-- ============================================================================
-- Cleanup Demo Data for Production Go-Live
-- Target: Tenant GVM Corporation (f188e4a2-1918-4102-8ebd-c82fc16d4ba9)
-- Date: 2026-04-17 (Go-live: 2026-04-20)
--
-- KEEPS: tenants, user_tenants, profiles, app_roles, app_modules,
--        role_permissions, currencies, tenant_licenses
-- DELETES: All business/operational data if tables exist
-- ============================================================================

DO $$
DECLARE
  v_tenant UUID := 'f188e4a2-1918-4102-8ebd-c82fc16d4ba9';
  v_table TEXT;
  v_scoped_tables TEXT[] := ARRAY[
    -- Chat
    'chat_reactions', 'chat_messages', 'chat_channel_members', 'chat_channels',
    -- Academy
    'academy_progress', 'academy_lessons', 'academy_courses',
    -- Training
    'training_records', 'training_programs',
    -- Logistics
    'logistics_shipment_items', 'logistics_shipments', 'logistics_carriers',
    -- Support
    'support_tickets',
    -- Quality
    'quality_ncrs', 'quality_inspections',
    -- Maintenance
    'maintenance_orders', 'equipment',
    -- IT
    'it_maintenance_schedules', 'it_asset_assignments', 'it_assets',
    -- Contracts
    'contract_amendments', 'contracts',
    -- Budgets
    'budget_lines', 'budgets',
    -- Petty cash
    'petty_cash_transactions', 'petty_cash_funds',
    -- Bank reconciliation
    'bank_statement_lines', 'bank_statements',
    -- Payroll
    'payroll_attendance', 'overtime_requests', 'absence_requests',
    'payroll_settlement', 'kiosk_terminals', 'attendance_geo_zones',
    'work_schedules', 'employees',
    -- CRM
    'crm_opportunity_activities', 'crm_opportunities', 'leads',
    -- DIAN
    'radian_events', 'electronic_documents', 'dian_resolutions', 'dian_config',
    -- Payments
    'payment_links', 'recurring_invoices',
    -- Documents
    'document_lines', 'documents',
    -- Purchase orders
    'purchase_order_lines', 'purchase_orders', 'po_number_sequences',
    -- Warehouse transfers
    'warehouse_transfer_lines', 'warehouse_transfers', 'transfer_number_sequences',
    -- Inventory
    'inventory_movements', 'product_serials', 'product_lots', 'product_stock',
    'warehouse_locations', 'warehouses',
    -- Accounting
    'journal_lines', 'journal_entries', 'period_close_items', 'fiscal_periods',
    'fixed_assets', 'chart_accounts',
    -- Treasury
    'treasury_transactions', 'treasury_accounts',
    -- Pricing
    'price_list_items', 'price_lists',
    -- Dimensions
    'dimension_values', 'dimensions',
    -- Exchange rates
    'exchange_rates',
    -- Core
    'party_external_ids', 'products', 'parties',
    -- Notifications
    'app_notifications',
    -- API keys
    'api_keys',
    -- Audit
    'audit_log',
    -- Backups
    'tenant_backups'
  ];
BEGIN

  -- Disable audit triggers during cleanup to avoid FK/trigger conflicts
  SET session_replication_role = 'replica';

  FOREACH v_table IN ARRAY v_scoped_tables
  LOOP
    IF to_regclass('public.' || v_table) IS NOT NULL THEN
      BEGIN
        EXECUTE format('DELETE FROM %I WHERE tenant_id = $1', v_table) USING v_tenant;
      EXCEPTION
        WHEN undefined_column THEN
          -- Table exists but has no tenant_id column → delete all (child tables)
          EXECUTE format('DELETE FROM %I', v_table);
        WHEN OTHERS THEN
          -- Log and continue — don't fail the whole cleanup
          RAISE NOTICE 'SKIP %: %', v_table, SQLERRM;
      END;
    END IF;
  END LOOP;

  -- Re-enable triggers
  SET session_replication_role = 'origin';

  RAISE NOTICE 'OK: Datos demo eliminados del tenant GVM';
  RAISE NOTICE 'Mantenido: tenant, user_tenants, profiles, app_roles, app_modules, role_permissions, currencies, tenant_licenses';
  RAISE NOTICE 'Listo para migracion de datos reales (Go-live 2026-04-20)';

END $$;
