-- ============================================================
-- DIAN: Agrega columna signed_at a electronic_documents
-- Migración: 20260303210000_electronic_documents_signed_at.sql
-- ============================================================
-- Registra cuándo fue aplicada la firma digital XAdES-BES
-- al documento electrónico, para auditoría y trazabilidad.

ALTER TABLE electronic_documents
    ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- Índice para consultas de documentos firmados vs. pendientes de firma
CREATE INDEX IF NOT EXISTS idx_electronic_docs_signed_at
    ON electronic_documents(signed_at)
    WHERE signed_at IS NOT NULL;

COMMENT ON COLUMN electronic_documents.signed_at IS
    'Fecha y hora (UTC) en que se aplicó la firma digital XAdES-BES al XML del documento.';
