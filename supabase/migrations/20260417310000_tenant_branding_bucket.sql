-- Create public bucket for tenant logos and branding assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-branding', 'tenant-branding', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read (public bucket), only service role can write (admin uploads)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND policyname = 'tenant_branding_public_read'
  ) THEN
    CREATE POLICY tenant_branding_public_read ON storage.objects
      FOR SELECT USING (bucket_id = 'tenant-branding');
  END IF;
END $$;
