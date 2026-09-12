select taxpayer_type,
       count(1) as terceros,
       count(1) filter (where applies_reteica) as aplican_reteica,
       count(1) filter (where first_name is not null and first_name <> '') as con_nombre_separado
from public.parties
group by taxpayer_type
order by terceros desc;
