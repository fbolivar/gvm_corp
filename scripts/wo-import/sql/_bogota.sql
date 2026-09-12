select city, count(1) as terceros, count(1) filter (where applies_reteica) as aplican_reteica
from public.parties
where city ilike '%bogot%'
group by city
order by terceros desc;
