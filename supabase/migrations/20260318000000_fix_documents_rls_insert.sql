-- Fix: Add WITH CHECK to documents RLS policy to allow INSERTs
-- Issue: Users could not create orders due to missing WITH CHECK clause
-- Date: 2026-03-18
-- Related: TEST-FLOW-REPORT.md

-- Drop existing policy
DROP POLICY IF EXISTS "documents_tenant_isolation" ON documents;

-- Recreate with both USING and WITH CHECK
CREATE POLICY "documents_tenant_isolation" ON documents
    FOR ALL
    USING (tenant_id = get_my_tenant_id())
    WITH CHECK (tenant_id = get_my_tenant_id());

-- Verify the policy was created correctly
COMMENT ON POLICY "documents_tenant_isolation" ON documents IS
  'Tenant isolation for documents table. USING clause for SELECT/UPDATE/DELETE. WITH CHECK clause for INSERT/UPDATE.';
