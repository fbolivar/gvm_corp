select to_char(issue_date, 'YYYY-MM') as mes,
       count(1) filter (where doc_type = 'INVOICE') as facturas,
       count(1) filter (where doc_type = 'CREDIT_NOTE') as notas_credito
from public.documents
where doc_type in ('INVOICE', 'CREDIT_NOTE')
group by 1
order by 1 desc
limit 8;
