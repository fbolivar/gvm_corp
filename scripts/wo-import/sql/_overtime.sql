select count(1) as total,
       min(date) as mas_antigua,
       max(date) as mas_reciente,
       count(distinct to_char(date, 'YYYY-MM')) as meses_con_datos
from public.overtime_requests;
