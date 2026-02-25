-- ==========================================
-- SAAS FACTORY V3 - CORE INDEX OPTIMIZATION
-- ==========================================
-- Objective: Optimize query performance for multi-tenant and RLS filtering 
-- by adding B-Tree indexes on frequently joined and filtered foreign keys.
-- This prevents Sequential Scans (Seq Scan) on large tables.

-- 1. Indexing `tenant_id` everywhere (Crucial for Multi-tenant isolation)
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON public.documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_document_lines_document_id ON public.document_lines(document_id);
CREATE INDEX IF NOT EXISTS idx_parties_tenant_id ON public.parties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_id ON public.journal_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry_id ON public.journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_id ON public.support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_treasury_transactions_tenant_id ON public.treasury_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_treasury_accounts_tenant_id ON public.treasury_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_reports_tenant_id ON public.payment_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_electronic_documents_document_id ON public.electronic_documents(document_id);

-- 2. Indexing other high-traffic foreign keys (CRM, Accounting, Treasury)
CREATE INDEX IF NOT EXISTS idx_documents_party_id ON public.documents(party_id);
CREATE INDEX IF NOT EXISTS idx_treasury_transactions_account_id ON public.treasury_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_treasury_transactions_party_id ON public.treasury_transactions(party_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_party_id ON public.support_tickets(party_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account_id ON public.journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_document_allocations_document_id ON public.document_allocations(document_id);
CREATE INDEX IF NOT EXISTS idx_document_allocations_transaction_id ON public.document_allocations(transaction_id);

-- 3. Composite Indexes for frequent compound queries (e.g. searching invoices by tenant and status)
CREATE INDEX IF NOT EXISTS idx_documents_tenant_doc_type_status ON public.documents(tenant_id, doc_type, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_status ON public.support_tickets(tenant_id, status);

-- 4. Fast search indexes (Trigram for like/ilike queries on heavily searched fields)
-- Note: Requires pg_trgm extension. Safe to create if not exists.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_parties_legal_name_trgm ON public.parties USING GIN (legal_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_parties_doc_number_trgm ON public.parties USING GIN (doc_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_sku_trgm ON public.products USING GIN (sku gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_documents_number_trgm ON public.documents USING GIN (number gin_trgm_ops);
