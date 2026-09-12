select
  (select count(1) from public.parties_backup_wo_20260824) as respaldo_filas,
  (select count(1) from public.taxpayer_types) as tipos,
  (select count(1) from information_schema.columns
    where table_name='parties' and column_name in ('applies_reteica','ica_rate')) as columnas_nuevas;
