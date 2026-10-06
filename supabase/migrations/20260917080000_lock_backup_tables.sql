-- Tablas de respaldo creadas el 2026-08-24 (reclasificación de terceros WO y
-- reglas contables) quedaron en `public` SIN RLS: PostgREST las exponía con la
-- clave anónima (6.709 terceros con NIT, correo y teléfono). Lo señaló el linter
-- de Supabase (rls_disabled_in_public).
--
-- No se borran (son la referencia de la migración WO); se cierran: RLS activo
-- sin ninguna política = nadie pasa por la API, y se revocan los grants de los
-- roles de la API. El service role (scripts de importación) sigue pudiendo leerlas.

ALTER TABLE public.parties_backup_wo_20260824 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_rules_backup_20260824 ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.parties_backup_wo_20260824 FROM anon, authenticated;
REVOKE ALL ON public.accounting_rules_backup_20260824 FROM anon, authenticated;
