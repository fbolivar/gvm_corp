-- ============================================================
-- Tenant Backups: metadata table + storage bucket
-- ============================================================

-- 1. Backup metadata table
CREATE TABLE IF NOT EXISTS tenant_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    created_by_email TEXT,
    type TEXT NOT NULL DEFAULT 'manual' CHECK (type IN ('manual', 'auto')),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    file_path TEXT, -- path in storage bucket
    file_size_bytes BIGINT DEFAULT 0,
    tables_included TEXT[] DEFAULT '{}',
    record_count INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE tenant_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_backups_policy" ON tenant_backups
    FOR ALL USING (tenant_id = get_my_tenant_id());

-- Grants
GRANT ALL ON tenant_backups TO authenticated;
GRANT ALL ON tenant_backups TO service_role;

-- Index
CREATE INDEX IF NOT EXISTS idx_tenant_backups_tenant ON tenant_backups(tenant_id, created_at DESC);

-- 2. Storage bucket for backups (admin-only, private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('backups', 'backups', false, 104857600, ARRAY['application/json'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies: only service_role can manage (API routes use admin client)
-- Authenticated users can read their tenant's backups
CREATE POLICY "backups_read_own_tenant" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'backups'
        AND (storage.foldername(name))[1] = get_my_tenant_id()::text
    );

-- Service role handles inserts/deletes (via admin client in API routes)
