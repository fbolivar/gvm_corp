select column_name, data_type, udt_name
from information_schema.columns
where table_name = 'accounting_rules'
order by ordinal_position;
