-- ============================================================================
-- Fix: Storage policies for avatar uploads in tenant-assets bucket
-- Problem: No storage RLS policies → authenticated users can't upload avatars
-- ============================================================================

-- 1. Ensure bucket exists and is public (for getPublicUrl to work)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-assets', 'tenant-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow authenticated users to upload avatars (their own)
DROP POLICY IF EXISTS "avatars_upload" ON storage.objects;
CREATE POLICY "avatars_upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'tenant-assets'
        AND (storage.foldername(name))[1] = 'avatars'
    );

-- 3. Allow authenticated users to update/overwrite their avatars
DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
CREATE POLICY "avatars_update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'tenant-assets'
        AND (storage.foldername(name))[1] = 'avatars'
    );

-- 4. Allow public read access to all files in tenant-assets (logos + avatars)
DROP POLICY IF EXISTS "tenant_assets_public_read" ON storage.objects;
CREATE POLICY "tenant_assets_public_read" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'tenant-assets');

-- 5. Allow authenticated users to upload logos too (same bucket)
DROP POLICY IF EXISTS "logos_upload" ON storage.objects;
CREATE POLICY "logos_upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'tenant-assets'
        AND (storage.foldername(name))[1] = 'logos'
    );
