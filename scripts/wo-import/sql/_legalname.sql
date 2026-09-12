select
  (select count(1) from public.parties where legal_name like '%' || chr(65533) || '%') as corruptos_ahora,
  (select count(1) from public.parties_backup_wo_20260824 where legal_name like '%' || chr(65533) || '%') as corruptos_antes,
  (select count(1) from public.parties where legal_name like '%CASTAÑEDA%') as castaneda_ok,
  (select count(1) from public.parties where city = 'Fusagasugá') as fusa_ok;
