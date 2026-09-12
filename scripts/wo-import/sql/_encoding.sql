select
  (select count(1) from public.parties where first_name like '%' || chr(65533) || '%') as nombres_corruptos_ahora,
  (select count(1) from public.parties_backup_wo_20260824 where first_name like '%' || chr(65533) || '%') as nombres_corruptos_antes,
  (select count(1) from public.parties where city like '%' || chr(65533) || '%') as ciudad_corrupta_ahora,
  (select count(1) from public.parties_backup_wo_20260824 where city like '%' || chr(65533) || '%') as ciudad_corrupta_antes,
  (select count(1) from public.parties where first_name ~ 'Ã') as nombres_dobleenc_ahora,
  (select count(1) from public.parties_backup_wo_20260824 where first_name ~ 'Ã') as nombres_dobleenc_antes;
