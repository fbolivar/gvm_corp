-- El bucket 'backups' se creó (20260306100000) solo con allowed_mime_types
-- = ['application/json'], para los backups viejos sin cifrar. El rediseño a
-- .gvm cifrado (2026-07-04) sube con contentType 'application/octet-stream',
-- que Storage rechaza en silencio: uploadError se loggea pero NUNCA bloquea
-- la respuesta ni el registro en tenant_backups (queda "completed" con
-- file_path=null). Resultado: CERO backups reales subidos desde julio.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['application/json', 'application/octet-stream']
WHERE id = 'backups';
