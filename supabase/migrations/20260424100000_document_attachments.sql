-- ============================================================================
-- document_attachments: adjuntos por departamento (COMERCIAL / CONTABLE)
-- Permite adjuntar recibos de caja menor, soportes contables, etc. por pedido
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_attachments (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tenant_id       UUID        NOT NULL DEFAULT get_my_tenant_id(),
    department      TEXT        NOT NULL CHECK (department IN ('COMERCIAL', 'CONTABLE')),
    file_name       TEXT        NOT NULL,
    file_size       BIGINT,
    mime_type       TEXT,
    storage_path    TEXT        NOT NULL,
    created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_name TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE document_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doc_attachments_tenant" ON document_attachments;
CREATE POLICY "doc_attachments_tenant" ON document_attachments
    FOR ALL TO authenticated
    USING  (tenant_id = get_my_tenant_id())
    WITH CHECK (tenant_id = get_my_tenant_id());

GRANT ALL ON document_attachments TO authenticated;

-- Storage bucket (ya existe, solo asegurar que no sea público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para la subcarpeta doc-attachments
-- Ruta: {tenantId}/doc-attachments/{documentId}/{COMERCIAL|CONTABLE}/{filename}

DROP POLICY IF EXISTS "doc_attachments_storage_insert" ON storage.objects;
CREATE POLICY "doc_attachments_storage_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'documents'
        AND (storage.foldername(name))[2] = 'doc-attachments'
    );

DROP POLICY IF EXISTS "doc_attachments_storage_select" ON storage.objects;
CREATE POLICY "doc_attachments_storage_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'documents'
        AND (storage.foldername(name))[2] = 'doc-attachments'
    );

DROP POLICY IF EXISTS "doc_attachments_storage_delete" ON storage.objects;
CREATE POLICY "doc_attachments_storage_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'documents'
        AND (storage.foldername(name))[2] = 'doc-attachments'
    );
