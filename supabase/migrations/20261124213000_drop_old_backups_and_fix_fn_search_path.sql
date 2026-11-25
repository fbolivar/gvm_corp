
-- (1) Eliminar respaldos viejos del 2026-08-24 (ya con RLS, nivel INFO). Confirmado por el usuario.
drop table if exists public.accounting_rules_backup_20260824;
drop table if exists public.parties_backup_wo_20260824;

-- (2) Fijar search_path en las dos funciones sin él (advisor function_search_path_mutable).
--     Ambas son SECURITY INVOKER y solo referencian objetos de public + nativos → sin riesgo.
alter function public.generate_document_number(uuid, document_type) set search_path = public, pg_temp;
alter function public.annual_increase_pct(numeric) set search_path = public, pg_temp;
