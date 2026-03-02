-- ============================================================
-- DIAN: Tablas de Facturación Electrónica
-- Migración: 20260302200000_dian_tables.sql
-- ============================================================

-- 1. Configuración DIAN por tenant
CREATE TABLE IF NOT EXISTS dian_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    software_id     TEXT,
    pin             TEXT,
    technical_key   TEXT,
    certificate_b64 TEXT,
    certificate_password TEXT,
    test_set_id     TEXT,
    test_set_id_payroll TEXT,
    environment     TEXT NOT NULL DEFAULT 'TEST' CHECK (environment IN ('TEST', 'PROD')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id)
);

ALTER TABLE dian_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_dian_config" ON dian_config
    USING (tenant_id = get_my_tenant_id());

CREATE POLICY "tenant_insert_dian_config" ON dian_config
    FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());

CREATE POLICY "tenant_update_dian_config" ON dian_config
    FOR UPDATE USING (tenant_id = get_my_tenant_id());

-- 2. Resoluciones de facturación
CREATE TABLE IF NOT EXISTS dian_resolutions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    prefix          TEXT NOT NULL DEFAULT '',
    resolution_number TEXT NOT NULL,
    resolution_date DATE NOT NULL,
    valid_from      DATE NOT NULL,
    valid_until     DATE NOT NULL,
    from_number     BIGINT NOT NULL DEFAULT 1,
    to_number       BIGINT NOT NULL,
    current_number  BIGINT NOT NULL DEFAULT 1,
    doc_type        TEXT NOT NULL DEFAULT 'INVOICE' CHECK (doc_type IN ('INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE', 'PAYROLL')),
    status          TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'EXPIRED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE dian_resolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_dian_resolutions" ON dian_resolutions
    USING (tenant_id = get_my_tenant_id());

CREATE POLICY "tenant_insert_dian_resolutions" ON dian_resolutions
    FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());

CREATE POLICY "tenant_update_dian_resolutions" ON dian_resolutions
    FOR UPDATE USING (tenant_id = get_my_tenant_id());

CREATE POLICY "tenant_delete_dian_resolutions" ON dian_resolutions
    FOR DELETE USING (tenant_id = get_my_tenant_id());

-- 3. Documentos electrónicos transmitidos
CREATE TABLE IF NOT EXISTS electronic_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    environment     TEXT NOT NULL DEFAULT 'TEST' CHECK (environment IN ('TEST', 'PROD')),
    cufe            TEXT,
    cude            TEXT,
    cune            TEXT,
    qr_data         TEXT,
    xml_url         TEXT,
    pdf_url         TEXT,
    xml_content     TEXT,
    dian_status     TEXT NOT NULL DEFAULT 'PENDING' CHECK (dian_status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'ERROR')),
    dian_response   JSONB,
    sent_at         TIMESTAMPTZ,
    accepted_at     TIMESTAMPTZ,
    rejected_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (document_id)
);

ALTER TABLE electronic_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_electronic_documents" ON electronic_documents
    USING (tenant_id = get_my_tenant_id());

CREATE POLICY "tenant_insert_electronic_documents" ON electronic_documents
    FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());

CREATE POLICY "tenant_update_electronic_documents" ON electronic_documents
    FOR UPDATE USING (tenant_id = get_my_tenant_id());

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_electronic_docs_document_id ON electronic_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_electronic_docs_dian_status ON electronic_documents(dian_status);
CREATE INDEX IF NOT EXISTS idx_electronic_docs_tenant ON electronic_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dian_resolutions_tenant ON dian_resolutions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dian_config_tenant ON dian_config(tenant_id);
