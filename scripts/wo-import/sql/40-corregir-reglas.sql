-- FASE 3 — Correcciones dictadas por el contador en la reunión del 2026-08-24.
--
-- (1) La autorretención de renta va SIEMPRE, sin importar el régimen. Faltaba en
--     14 escenarios de Régimen Simple. En factura: débito 13551511 / crédito
--     23657501; en nota crédito se invierte (se devuelve la retención).
-- (2) TODAS las devoluciones van a la 4175: un escenario usaba 41352203, que es
--     cuenta de venta, no de devolución.
--
-- Nota: `payment_form` es un enum en la base, por eso los casts explícitos.

-- Respaldo antes de tocar las reglas.
create table if not exists public.accounting_rules_backup_20260824 as table public.accounting_rules;

-- (1) Autorretención faltante en Régimen Simple
insert into public.accounting_rules (tenant_id, doc_kind, iva_rate, taxpayer_code, payment_form, account_code, nature, concept, is_active)
select t.tenant_id, e.doc_kind, e.iva_rate, e.taxpayer_code, e.payment_form::payment_form, c.account_code,
       case when e.doc_kind = 'FV' then c.nature_fv else c.nature_nc end,
       c.concept, true
  from (select tenant_id from public.accounting_rules limit 1) t
 cross join (values
        ('FV', 0,  'RST_PN', 'CREDITO'), ('FV', 0,  'RST_PN', 'CONTADO'),
        ('NC', 0,  'RST_PJ', 'CREDITO'), ('NC', 0,  'RST_PN', 'CREDITO'),
        ('NC', 0,  'RST_PN', 'CONTADO'),
        ('NC', 5,  'RST_PJ', 'CREDITO'), ('NC', 5,  'RST_PN', 'CREDITO'),
        ('NC', 5,  'RST_PJ', 'CONTADO'), ('NC', 5,  'RST_PN', 'CONTADO'),
        ('FV', 19, 'RST_PJ', 'CREDITO'), ('FV', 19, 'RST_PN', 'CREDITO'),
        ('FV', 19, 'RST_PN', 'CONTADO'),
        ('NC', 19, 'RST_PJ', 'CREDITO'), ('NC', 19, 'RST_PJ', 'CONTADO')
     ) as e(doc_kind, iva_rate, taxpayer_code, payment_form)
 cross join (values
        ('13551511', 'D', 'C', 'AUTORRENTA_ANTICIPO'),
        ('23657501', 'C', 'D', 'AUTORRENTA_PASIVO')
     ) as c(account_code, nature_fv, nature_nc, concept)
 where not exists (
        select 1 from public.accounting_rules r
         where r.doc_kind = e.doc_kind
           and r.iva_rate = e.iva_rate
           and r.taxpayer_code = e.taxpayer_code
           and r.payment_form::text = e.payment_form
           and r.concept = c.concept);

-- (2) Devolución del 19% con cuenta de venta → cuenta de devoluciones
update public.accounting_rules
   set account_code = '417503'
 where doc_kind = 'NC' and concept = 'INGRESO' and account_code = '41352203';
