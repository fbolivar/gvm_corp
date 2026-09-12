select p.legal_name, p.city, p.taxpayer_type, p.applies_reteica, p.ica_rate,
       count(d.id) as facturas
from public.documents d
join public.parties p on p.id = d.party_id
where d.doc_type in ('INVOICE', 'CREDIT_NOTE')
  and d.issue_date >= '2026-07-01'
group by p.legal_name, p.city, p.taxpayer_type, p.applies_reteica, p.ica_rate
order by facturas desc;
