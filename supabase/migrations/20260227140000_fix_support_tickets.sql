-- Fix support_tickets: add missing columns
-- Real columns: id, tenant_id, party_id, status, created_at
-- Expected: number, subject, description, category, priority, assigned_to, sla_deadline,
--           ref_doc_id, ref_product_id, metadata, updated_at

ALTER TABLE support_tickets
    ADD COLUMN IF NOT EXISTS number TEXT,
    ADD COLUMN IF NOT EXISTS subject TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'OTHER'
        CHECK (category IN ('TECHNICAL', 'BILLING', 'RMA', 'LOGISTICS', 'OTHER')),
    ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'MEDIUM'
        CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ref_doc_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS ref_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS metadata JSONB,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- The join assigned_user:profiles(...) uses assigned_to → profiles.id (auth.users.id = profiles.id)
-- PostgREST resolves this via the FK: assigned_to → auth.users → profiles (same id)
-- We need a direct FK to profiles to make the embed work cleanly
-- PostgREST can also use: support_tickets!assigned_to(full_name) if FK points to profiles
-- Simpler: add a comment FK hint or use profiles directly via user_id = assigned_to
-- The query uses: assigned_user:profiles(full_name) — needs FK from support_tickets.assigned_to -> profiles.id
-- profiles.id = auth.users.id, so we add the FK to auth.users which PostgREST can traverse

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON support_tickets(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_party ON support_tickets(party_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(tenant_id, status);
