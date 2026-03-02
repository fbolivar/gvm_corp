-- =============================================
-- MÓDULO: Integración Bancaria / Links de Pago
-- Fecha: 2026-03-02
-- Descripción: Tabla para links de pago públicos
--              vinculados a facturas de venta.
--              Compatible con PSE, Nequi, Bancolombia.
-- =============================================

CREATE TABLE IF NOT EXISTS payment_links (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id    UUID         NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    token          TEXT         NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
    amount         NUMERIC(15,2) NOT NULL,
    currency       TEXT         NOT NULL DEFAULT 'COP',
    status         TEXT         NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','PAID','EXPIRED','CANCELLED')),
    payment_method TEXT         CHECK (payment_method IN ('PSE','NEQUI','BANCOLOMBIA_TRANSFER','CASH')),
    payer_name     TEXT,
    payer_email    TEXT,
    payer_doc      TEXT,
    bank_reference TEXT,
    expires_at     TIMESTAMPTZ  NOT NULL DEFAULT now() + INTERVAL '72 hours',
    paid_at        TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Row-Level Security
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados solo ven links de su tenant
CREATE POLICY "tenant_isolation" ON payment_links
    USING (tenant_id = get_my_tenant_id());

-- Lectura pública por token (para la página de pago externa)
CREATE POLICY "public_read_by_token" ON payment_links
    FOR SELECT USING (true);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_payment_links_token
    ON payment_links(token);

CREATE INDEX IF NOT EXISTS idx_payment_links_document
    ON payment_links(document_id);

CREATE INDEX IF NOT EXISTS idx_payment_links_tenant_status
    ON payment_links(tenant_id, status);
