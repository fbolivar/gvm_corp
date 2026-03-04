-- ============================================================================
-- Audit Triggers: Auto-populate audit_log on INSERT/UPDATE/DELETE
-- ============================================================================

-- 1. Generic trigger function
CREATE OR REPLACE FUNCTION fn_audit_log() RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id UUID;
    v_entity_id TEXT;
    v_old JSONB;
    v_new JSONB;
BEGIN
    -- Determine tenant_id (some tables may not have it)
    BEGIN
        IF TG_OP = 'DELETE' THEN
            v_tenant_id := OLD.tenant_id;
        ELSE
            v_tenant_id := NEW.tenant_id;
        END IF;
    EXCEPTION WHEN undefined_column THEN
        v_tenant_id := NULL;
    END;

    -- Determine entity_id
    IF TG_OP = 'DELETE' THEN
        v_entity_id := OLD.id::TEXT;
    ELSE
        v_entity_id := NEW.id::TEXT;
    END IF;

    -- Build old/new payloads
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        v_old := to_jsonb(OLD);
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        v_new := to_jsonb(NEW);
    END IF;

    INSERT INTO audit_log (tenant_id, actor_user_id, action, entity, entity_id, payload)
    VALUES (
        v_tenant_id,
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        v_entity_id,
        jsonb_build_object('old', v_old, 'new', v_new)
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Apply triggers to all auditable tables
-- Core
CREATE TRIGGER trg_audit_parties AFTER INSERT OR UPDATE OR DELETE ON parties FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_profiles AFTER INSERT OR UPDATE OR DELETE ON profiles FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- Documents
CREATE TRIGGER trg_audit_documents AFTER INSERT OR UPDATE OR DELETE ON documents FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_document_lines AFTER INSERT OR UPDATE OR DELETE ON document_lines FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- Products & Inventory
CREATE TRIGGER trg_audit_products AFTER INSERT OR UPDATE OR DELETE ON products FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_product_lots AFTER INSERT OR UPDATE OR DELETE ON product_lots FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_inventory_movements AFTER INSERT OR UPDATE OR DELETE ON inventory_movements FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- Purchasing
CREATE TRIGGER trg_audit_purchase_orders AFTER INSERT OR UPDATE OR DELETE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_purchase_order_lines AFTER INSERT OR UPDATE OR DELETE ON purchase_order_lines FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- Accounting
CREATE TRIGGER trg_audit_journal_entries AFTER INSERT OR UPDATE OR DELETE ON journal_entries FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_journal_lines AFTER INSERT OR UPDATE OR DELETE ON journal_lines FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_budgets AFTER INSERT OR UPDATE OR DELETE ON budgets FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_budget_lines AFTER INSERT OR UPDATE OR DELETE ON budget_lines FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_fixed_assets AFTER INSERT OR UPDATE OR DELETE ON fixed_assets FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_fiscal_periods AFTER INSERT OR UPDATE OR DELETE ON fiscal_periods FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- Treasury
CREATE TRIGGER trg_audit_treasury_accounts AFTER INSERT OR UPDATE OR DELETE ON treasury_accounts FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_treasury_transactions AFTER INSERT OR UPDATE OR DELETE ON treasury_transactions FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_bank_statements AFTER INSERT OR UPDATE OR DELETE ON bank_statements FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- Payroll (excluding payroll_attendance — high volume, low audit value)
CREATE TRIGGER trg_audit_employees AFTER INSERT OR UPDATE OR DELETE ON employees FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_overtime_requests AFTER INSERT OR UPDATE OR DELETE ON overtime_requests FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_absence_requests AFTER INSERT OR UPDATE OR DELETE ON absence_requests FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- CRM
CREATE TRIGGER trg_audit_leads AFTER INSERT OR UPDATE OR DELETE ON leads FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_crm_opportunities AFTER INSERT OR UPDATE OR DELETE ON crm_opportunities FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- Quality
CREATE TRIGGER trg_audit_quality_inspections AFTER INSERT OR UPDATE OR DELETE ON quality_inspections FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_quality_ncrs AFTER INSERT OR UPDATE OR DELETE ON quality_ncrs FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- Maintenance
CREATE TRIGGER trg_audit_equipment AFTER INSERT OR UPDATE OR DELETE ON equipment FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_maintenance_orders AFTER INSERT OR UPDATE OR DELETE ON maintenance_orders FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- Training
CREATE TRIGGER trg_audit_training_programs AFTER INSERT OR UPDATE OR DELETE ON training_programs FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_training_records AFTER INSERT OR UPDATE OR DELETE ON training_records FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- Contracts
CREATE TRIGGER trg_audit_contracts AFTER INSERT OR UPDATE OR DELETE ON contracts FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- Support
CREATE TRIGGER trg_audit_support_tickets AFTER INSERT OR UPDATE OR DELETE ON support_tickets FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- DIAN
CREATE TRIGGER trg_audit_dian_config AFTER INSERT OR UPDATE OR DELETE ON dian_config FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_dian_resolutions AFTER INSERT OR UPDATE OR DELETE ON dian_resolutions FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
CREATE TRIGGER trg_audit_electronic_documents AFTER INSERT OR UPDATE OR DELETE ON electronic_documents FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- Logistics
CREATE TRIGGER trg_audit_logistics_shipments AFTER INSERT OR UPDATE OR DELETE ON logistics_shipments FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_created ON audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_user_id, created_at DESC);
