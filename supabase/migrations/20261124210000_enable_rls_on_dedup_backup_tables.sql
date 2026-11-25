
-- Tablas de respaldo temporales de las operaciones del 2026-11-12 (fix de espacios en SKU
-- y fusión de productos duplicados). Están en el esquema public expuesto por PostgREST sin
-- RLS (advisor rls_disabled_in_public, nivel ERROR). Ninguna app las consulta. Se habilita
-- RLS sin políticas: quedan accesibles solo por service_role, cerrando la exposición.
alter table public._sku_space_fix_bkp_20261112 enable row level security;
alter table public._dup_merge_backup_20261112 enable row level security;
