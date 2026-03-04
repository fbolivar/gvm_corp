-- ============================================================================
-- Fix: GRANTs for app_notifications table
-- Problem: Table created without explicit GRANTs for authenticated role.
--          Operations (INSERT/UPDATE/DELETE) fail silently.
-- ============================================================================

-- 1. Explicit GRANTs
GRANT ALL ON TABLE app_notifications TO authenticated;
GRANT ALL ON TABLE app_notifications TO service_role;
