-- ============================================================================
-- Segunda ronda de correcciones del contador Andrés a la matriz de ventas
-- (respuesta 2026-09-22 a la simulación contable).
-- ============================================================================

-- 1. Gran Contribuyente No Autorretenedor: faltaba RETEFUENTE en factura y
--    nota crédito de CONTADO al 0% (ya existía en CREDITO 0% y en 5%/19% de
--    ambas formas de pago — solo faltaba esta combinación).
INSERT INTO accounting_rules (tenant_id, doc_kind, iva_rate, payment_form, taxpayer_code, account_code, nature, concept, is_active)
SELECT id, 'FV', 0, 'CONTADO', 'GC_NO_AUTORRET', '13551501', 'D', 'RETEFUENTE', true
FROM tenants WHERE name ILIKE '%GVM%'
ON CONFLICT DO NOTHING;

INSERT INTO accounting_rules (tenant_id, doc_kind, iva_rate, payment_form, taxpayer_code, account_code, nature, concept, is_active)
SELECT id, 'NC', 0, 'CONTADO', 'GC_NO_AUTORRET', '13551501', 'C', 'RETEFUENTE', true
FROM tenants WHERE name ILIKE '%GVM%'
ON CONFLICT DO NOTHING;

-- 2. Persona Jurídica Autorretenedor: faltaba RETEFUENTE en la nota crédito
--    (devolución) al 0%, tanto de contado como a crédito.
INSERT INTO accounting_rules (tenant_id, doc_kind, iva_rate, payment_form, taxpayer_code, account_code, nature, concept, is_active)
SELECT id, 'NC', 0, 'CONTADO', 'PJ_AUTORRET', '13551501', 'C', 'RETEFUENTE', true
FROM tenants WHERE name ILIKE '%GVM%'
ON CONFLICT DO NOTHING;

INSERT INTO accounting_rules (tenant_id, doc_kind, iva_rate, payment_form, taxpayer_code, account_code, nature, concept, is_active)
SELECT id, 'NC', 0, 'CREDITO', 'PJ_AUTORRET', '13551501', 'C', 'RETEFUENTE', true
FROM tenants WHERE name ILIKE '%GVM%'
ON CONFLICT DO NOTHING;

-- 3. Persona Natural o Jurídica Ley 1429: confirmado que NUNCA se practica
--    retefuente (beneficio tributario). Existían filas heredadas del import
--    original que sí generarían retefuente (la tarifa de retefuente es única
--    por año en tax_configurations; el motor la aplica si existe la fila en
--    accounting_rules, sin importar el iva_rate) — se eliminan.
DELETE FROM accounting_rules WHERE taxpayer_code = 'PN_LEY_1429' AND concept = 'RETEFUENTE';

-- 4. Persona Natural Responsable del IVA: confirmado que NO debe tener
--    retefuente en NINGUNA contabilización. Quedaba una fila suelta
--    (NC / CRÉDITO / 0%) que sí la generaría.
DELETE FROM accounting_rules WHERE taxpayer_code = 'PN_RESP_IVA' AND concept = 'RETEFUENTE';

-- ============================================================================
-- Reclasificación de terceros (respuesta del contador al Excel de terceros
-- que no cruzan — "Terceros a revisar - tipo de contribuyente2.xlsx").
-- El importador de WorldOffice los dejó todos en REGIMEN_SIMPLE (→ resuelve
-- como RST_PJ) por defecto; dos casos venían con otro código legado mal
-- mapeado. Se actualiza al código real de `taxpayer_types` que confirmó
-- Andrés. AGROPECUARIA FONTEVERDE y CAVIAGRO SAS no se tocan: ya eran
-- RST_PJ, que es lo que él confirmó como correcto.
-- ============================================================================

UPDATE parties SET taxpayer_type = 'PJ' WHERE id IN (
  '71c7785b-3b8f-4311-b76f-a0604a2e616e', -- AGROAVICOLA ORIGEN SAS
  'a805b413-ca0f-4bf5-9089-82f953aa14c4', -- AGROPECUARIA VALCÁRCEL S.A.S
  'cee46379-0788-4655-8b99-c0c2daf71a3a', -- AVICOLA HUEVOS REALES S.A.S.
  '36b3e45f-56fe-4aa6-8003-75421eb2da34', -- CAMPO VERDE DEL OCCIDENTE S.A.S.
  'c5f7868d-2a53-497f-952b-ba39cc21ff9a', -- INVERSIONES SOGA S.A.
  '054aa375-3c89-4d8d-b5f1-820be90fa1ea'  -- VACHE LAIT S.A.S.
);

UPDATE parties SET taxpayer_type = 'PN_NO_RESP_IVA' WHERE id IN (
  'cc5f3d4e-f88b-4277-9ab8-8a1dc1f64d1a', -- DIEGO ALEXANDER RODRIGUEZ MUNEVAR
  '7d3a3baa-6fd5-428a-86c7-091165103e2a', -- NOHORA ALEJANDRA FUENTES VELASQUEZ
  'df647411-a870-45ee-bec4-55785930ecde'  -- YULY MARITZA SUAREZ RUBIO
);

-- PEÑA GAITAN JHON JAIRO: SOLO el registro con pedidos reales (hay un
-- duplicado sin ninguna orden, ver nota en el reporte al usuario — no se
-- toca ese duplicado aquí, es limpieza aparte).
UPDATE parties SET taxpayer_type = 'PN_RESP_IVA' WHERE id IN (
  '11d898e6-3bb8-4788-a63b-c83b4a7d95ab', -- PEÑA GAITAN JHON JAIRO (con pedidos)
  '2f456dc9-3da3-43d4-b2a5-79b2de83b869', -- WILLIAM OSWALDO CRUZ HUERTAS
  'c022580d-8820-48a8-b5f7-d323301e8bb3'  -- YESICA YOHANA GARCIA ESCUDERO
);
