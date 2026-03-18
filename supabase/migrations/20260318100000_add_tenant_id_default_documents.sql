-- Add DEFAULT to tenant_id column in documents table
-- This allows RLS WITH CHECK to pass by automatically setting tenant_id on INSERT
-- Issue: RLS policy blocks INSERTs because tenant_id is NULL if not explicitly provided
-- Date: 2026-03-18
-- Related: TEST-FLOW-REPORT.md

-- Add DEFAULT to documents table
ALTER TABLE documents
ALTER COLUMN tenant_id SET DEFAULT get_my_tenant_id();

COMMENT ON COLUMN documents.tenant_id IS
  'Tenant isolation. Automatically set to user tenant on INSERT via DEFAULT get_my_tenant_id()';
