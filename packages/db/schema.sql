-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMS
DO $$ BEGIN
    CREATE TYPE party_type AS ENUM ('PERSON', 'COMPANY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE doc_id_type AS ENUM ('NIT', 'CC', 'CE', 'PP', 'TI');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE product_type AS ENUM ('GOOD', 'SERVICE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tax_regime AS ENUM ('COMMON', 'SIMPLIFIED', 'GREAT_CONTRIBUTOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE document_status AS ENUM ('DRAFT', 'SIGNED', 'SENT', 'ACCEPTED', 'REJECTED', 'VOIDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE document_type AS ENUM ('INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE', 'PAYROLL', 'PAYROLL_ADJUST', 'DOC_SUPPORT', 'RECEIPT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE movement_type AS ENUM ('IN', 'OUT', 'TRANSFER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. TENANCY & AUTH
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    nit TEXT NOT NULL,
    dv TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES auth.users(id),
    role TEXT NOT NULL DEFAULT 'viewer',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- RLS Helper Function
CREATE OR REPLACE FUNCTION get_current_tenant_id() RETURNS UUID AS $$
    SELECT tenant_id FROM user_tenants 
    WHERE user_id = auth.uid() 
    LIMIT 1; -- Simply gets first tenant for now, in real app set logic via claims or session
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. AUDIT LOG (Immutable)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    actor_user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    payload JSONB,
    prev_hash TEXT,
    chain_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit View" ON audit_log;
CREATE POLICY "Audit View" ON audit_log FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
);
-- No UPDATE/DELETE policies = Immutable

-- 3. PARTIES (Unified Third Parties)
CREATE TABLE IF NOT EXISTS parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    party_type party_type NOT NULL,
    legal_name TEXT NOT NULL,
    trade_name TEXT,
    doc_type doc_id_type NOT NULL,
    doc_number TEXT NOT NULL,
    nit TEXT, -- Normalized NIT
    dv TEXT,
    email TEXT,
    phone TEXT,
    is_customer BOOLEAN DEFAULT FALSE,
    is_vendor BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, doc_type, doc_number)
);
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant Isolation" ON parties;
CREATE POLICY "Tenant Isolation" ON parties USING (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS party_external_ids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    party_id UUID REFERENCES parties(id),
    source_system TEXT NOT NULL, -- 'DOLIBARR', 'WORLD_OFFICE'
    source_table TEXT NOT NULL,
    source_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, source_system, source_table, source_id)
);
ALTER TABLE party_external_ids ENABLE ROW LEVEL SECURITY;

-- 4. PRODUCTS & INVENTORY
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    type product_type NOT NULL,
    uom TEXT DEFAULT 'UNIT',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, sku)
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    warehouse_id UUID REFERENCES warehouses(id),
    product_id UUID REFERENCES products(id),
    type movement_type NOT NULL,
    qty NUMERIC NOT NULL,
    cost NUMERIC DEFAULT 0,
    ref_doc_type TEXT,
    ref_doc_id UUID,
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- 5. DOCUMENTS (Sales, Purchases, Payroll headers)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    doc_type document_type NOT NULL,
    number TEXT NOT NULL, -- Consecutivo
    party_id UUID REFERENCES parties(id),
    issue_date DATE NOT NULL,
    due_date DATE,
    currency TEXT DEFAULT 'COP',
    subtotal NUMERIC DEFAULT 0,
    taxes NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    status document_status DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, doc_type, number)
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS document_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    document_id UUID REFERENCES documents(id),
    product_id UUID REFERENCES products(id),
    description TEXT,
    qty NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL,
    line_total NUMERIC NOT NULL,
    tax_config JSONB -- { "iva": 19, "rete": 2.5 }
);
ALTER TABLE document_lines ENABLE ROW LEVEL SECURITY;

-- 6. ELECTRONIC DOCUMENTS (DIAN)
CREATE TABLE IF NOT EXISTS electronic_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    document_id UUID REFERENCES documents(id),
    environment TEXT DEFAULT 'TEST', -- TEST, PROD
    xml_url TEXT,
    pdf_url TEXT,
    cufe TEXT,
    cude TEXT,
    qr_data TEXT,
    dian_status TEXT, -- ACCEPTED, REJECTED
    sent_at TIMESTAMPTZ,
    UNIQUE(document_id)
);
ALTER TABLE electronic_documents ENABLE ROW LEVEL SECURITY;

-- 7. ACCOUNTING (NIIF)
CREATE TABLE IF NOT EXISTS chart_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    is_auxiliary BOOLEAN DEFAULT TRUE,
    nature TEXT CHECK (nature IN ('DEBIT', 'CREDIT')),
    UNIQUE(tenant_id, code)
);
ALTER TABLE chart_accounts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    entry_date DATE NOT NULL,
    description TEXT,
    number TEXT,
    period TEXT, -- '2025-01'
    status TEXT DEFAULT 'POSTED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS journal_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    entry_id UUID REFERENCES journal_entries(id),
    account_id UUID REFERENCES chart_accounts(id),
    party_id UUID REFERENCES parties(id),
    debit NUMERIC DEFAULT 0,
    credit NUMERIC DEFAULT 0,
    description TEXT
);
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
