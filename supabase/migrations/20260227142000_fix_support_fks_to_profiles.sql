-- Fix all support table FKs that reference auth.users → should reference public.profiles
-- PostgREST requires FKs to be in public schema to resolve embedded joins.

-- 1. support_interactions.author_id → profiles
ALTER TABLE support_interactions
    DROP CONSTRAINT IF EXISTS support_interactions_author_id_fkey;
ALTER TABLE support_interactions
    ADD CONSTRAINT support_interactions_author_id_profiles_fkey
    FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. support_audit_log.actor_id → profiles
ALTER TABLE support_audit_log
    DROP CONSTRAINT IF EXISTS support_audit_log_actor_id_fkey;
ALTER TABLE support_audit_log
    ADD CONSTRAINT support_audit_log_actor_id_profiles_fkey
    FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- 3. Verify support_tickets.ref_doc_id → documents (already set in migration 140000)
-- 4. Verify support_tickets.ref_product_id → products (already set in migration 140000)
