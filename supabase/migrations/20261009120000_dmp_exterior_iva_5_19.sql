-- Devolución de compra al EXTERIOR (DMP) con IVA 5% y 19%.
-- Antes solo existía en 0% (cuenta de inventario 143502). El contador pidió copiar
-- la misma estructura cambiando solo la cuenta de devolución de inventario:
--   5%  → 143504
--   19% → 143506
-- Las demás líneas (proveedores 220501, retefuente 23654001, reteica 23680101) se mantienen.

INSERT INTO purchase_accounting_rules (tenant_id, doc_kind, iva_rate, payment_form, taxpayer_code, account_code, nature, concept, is_active)
SELECT tenant_id, doc_kind, 5.00, payment_form, taxpayer_code,
       CASE WHEN account_code = '143502' THEN '143504' ELSE account_code END,
       nature, concept, is_active
FROM purchase_accounting_rules
WHERE doc_kind = 'DMP' AND taxpayer_code = 'EXTERIOR' AND iva_rate = 0.00
ON CONFLICT (tenant_id, doc_kind, iva_rate, payment_form, taxpayer_code, account_code, nature) DO NOTHING;

INSERT INTO purchase_accounting_rules (tenant_id, doc_kind, iva_rate, payment_form, taxpayer_code, account_code, nature, concept, is_active)
SELECT tenant_id, doc_kind, 19.00, payment_form, taxpayer_code,
       CASE WHEN account_code = '143502' THEN '143506' ELSE account_code END,
       nature, concept, is_active
FROM purchase_accounting_rules
WHERE doc_kind = 'DMP' AND taxpayer_code = 'EXTERIOR' AND iva_rate = 0.00
ON CONFLICT (tenant_id, doc_kind, iva_rate, payment_form, taxpayer_code, account_code, nature) DO NOTHING;
