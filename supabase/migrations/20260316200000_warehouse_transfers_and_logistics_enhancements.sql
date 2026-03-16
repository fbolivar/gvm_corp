-- =============================================
-- Warehouse Transfers + Logistics Enhancements
-- 2026-03-16
-- =============================================

-- Clean up any partial run artifacts
DROP FUNCTION IF EXISTS generate_transfer_number(UUID) CASCADE;
DROP FUNCTION IF EXISTS trg_set_transfer_number() CASCADE;
DROP FUNCTION IF EXISTS trg_transfers_updated_at() CASCADE;
DROP TABLE IF EXISTS warehouse_transfer_lines CASCADE;
DROP TABLE IF EXISTS warehouse_transfers CASCADE;
DROP TABLE IF EXISTS transfer_number_sequences CASCADE;

-- 1. Warehouse Transfers
CREATE TABLE IF NOT EXISTS warehouse_transfers (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transfer_number   TEXT         NOT NULL,
    from_warehouse_id UUID         NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    to_warehouse_id   UUID         NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    status            TEXT         NOT NULL DEFAULT 'DRAFT'
                                   CHECK (status IN ('DRAFT','IN_TRANSIT','RECEIVED','CANCELLED')),
    notes             TEXT,
    transferred_by    UUID         REFERENCES auth.users(id),
    received_by       UUID         REFERENCES auth.users(id),
    transferred_at    TIMESTAMPTZ,
    received_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_different_warehouses CHECK (from_warehouse_id != to_warehouse_id)
);

CREATE TABLE IF NOT EXISTS warehouse_transfer_lines (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id     UUID           NOT NULL REFERENCES warehouse_transfers(id) ON DELETE CASCADE,
    product_id      UUID           NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    qty             NUMERIC(15,4)  NOT NULL CHECK (qty > 0),
    qty_received    NUMERIC(15,4)  NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
    notes           TEXT,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- Transfer number sequence
CREATE TABLE IF NOT EXISTS transfer_number_sequences (
    tenant_id   UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    year        INT     NOT NULL,
    last_value  INT     NOT NULL DEFAULT 0,
    PRIMARY KEY (tenant_id, year)
);

-- Auto-generate transfer number
CREATE OR REPLACE FUNCTION generate_transfer_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
    v_next INT;
BEGIN
    INSERT INTO transfer_number_sequences (tenant_id, year, last_value)
    VALUES (p_tenant_id, v_year, 1)
    ON CONFLICT (tenant_id, year)
    DO UPDATE SET last_value = transfer_number_sequences.last_value + 1
    RETURNING last_value INTO v_next;

    RETURN 'TR-' || v_year || '-' || LPAD(v_next::TEXT, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION trg_set_transfer_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.transfer_number IS NULL OR NEW.transfer_number = '' THEN
        NEW.transfer_number := generate_transfer_number(NEW.tenant_id);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_transfer_number
    BEFORE INSERT ON warehouse_transfers
    FOR EACH ROW EXECUTE FUNCTION trg_set_transfer_number();

-- RLS for transfers
ALTER TABLE warehouse_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_transfer_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_number_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transfer_tenant_isolation" ON warehouse_transfers
    FOR ALL USING (tenant_id = get_my_tenant_id());

CREATE POLICY "transfer_lines_via_transfer" ON warehouse_transfer_lines
    FOR ALL USING (
        transfer_id IN (SELECT id FROM warehouse_transfers WHERE tenant_id = get_my_tenant_id())
    );

CREATE POLICY "transfer_seq_deny_all" ON transfer_number_sequences
    FOR ALL USING (false);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transfers_tenant_status ON warehouse_transfers(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_transfer_lines_transfer ON warehouse_transfer_lines(transfer_id);

-- 2. Enhance logistics_shipments with collaborators, freight, and new statuses
-- Drop the inline CHECK constraint by finding its real name
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'logistics_shipments'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%status%'
    LIMIT 1;

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE logistics_shipments DROP CONSTRAINT ' || quote_ident(constraint_name);
    END IF;
END;
$$;

-- Update any existing rows with old statuses to new equivalents
UPDATE logistics_shipments SET status = 'RECIBIDO' WHERE status NOT IN ('RECIBIDO','EN_ALISTAMIENTO','LISTO_DESPACHO','DESPACHADO','EN_TRANSITO','ENTREGADO','RETURNED');

ALTER TABLE logistics_shipments
    ADD CONSTRAINT logistics_shipments_status_check
    CHECK (status IN (
        'RECIBIDO','EN_ALISTAMIENTO','LISTO_DESPACHO','DESPACHADO','EN_TRANSITO','ENTREGADO','RETURNED'
    )) NOT VALID;

ALTER TABLE logistics_shipments VALIDATE CONSTRAINT logistics_shipments_status_check;

-- Collaborator tracking
ALTER TABLE logistics_shipments ADD COLUMN IF NOT EXISTS prepared_by UUID REFERENCES auth.users(id);
ALTER TABLE logistics_shipments ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);
ALTER TABLE logistics_shipments ADD COLUMN IF NOT EXISTS dispatched_by UUID REFERENCES auth.users(id);
ALTER TABLE logistics_shipments ADD COLUMN IF NOT EXISTS delivered_by_name TEXT;

-- Freight cost
ALTER TABLE logistics_shipments ADD COLUMN IF NOT EXISTS freight_cost NUMERIC(15,2) NOT NULL DEFAULT 0;

-- Updated at trigger for transfers
CREATE OR REPLACE FUNCTION trg_transfers_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_warehouse_transfers_updated
    BEFORE UPDATE ON warehouse_transfers
    FOR EACH ROW EXECUTE FUNCTION trg_transfers_updated_at();
