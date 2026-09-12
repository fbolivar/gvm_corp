select jsonb_agg(row_to_json(t)) as data
from (
  select doc_kind, iva_rate, taxpayer_code, payment_form, account_code, nature, concept, is_active
  from public.accounting_rules
) t;
