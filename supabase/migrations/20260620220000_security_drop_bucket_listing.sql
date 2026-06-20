-- Seguridad: los buckets públicos sirven objetos por URL sin política de listado.
-- El app solo usa getPublicUrl/subida (nunca .list()), así que se quita la
-- política amplia de SELECT que permitía listar todos los archivos.
DROP POLICY IF EXISTS "tenant_assets_public_read" ON storage.objects;
DROP POLICY IF EXISTS "tenant_branding_public_read" ON storage.objects;
