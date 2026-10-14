-- Corrección solicitada por el contador (Andrés Benavides, 2026-10-14) sobre la
-- validación de contabilización de compras:
--   "están bien las cuentas de devolución contra la de proveedor 221001,
--    no lleva ninguna retención"
--
-- La devolución de compra al EXTERIOR (DMP) debe:
--   1) cruzarse contra 221001 PROVEEDORES EXTRANJEROS (no 220501 nacionales), y
--   2) NO practicar ninguna retención (ni retefuente 23654001 ni reteica 23680101).
--
-- Las reglas de las tres tarifas (0%, 5%, 19%) se habían sembrado copiando la
-- estructura nacional, que sí lleva proveedor nacional + retenciones. Aquí se
-- corrige únicamente el escenario EXTERIOR, sin tocar las compras/devoluciones
-- nacionales.

-- 1) Proveedor: 220501 (nacionales) -> 221001 (extranjeros) para EXTERIOR.
UPDATE purchase_accounting_rules
SET account_code = '221001'
WHERE doc_kind = 'DMP'
  AND taxpayer_code = 'EXTERIOR'
  AND concept = 'PROVEEDORES'
  AND account_code = '220501';

-- 2) Las importaciones no son sujetas a retención en la fuente ni ReteICA:
--    se eliminan esas líneas de la devolución al exterior.
DELETE FROM purchase_accounting_rules
WHERE doc_kind = 'DMP'
  AND taxpayer_code = 'EXTERIOR'
  AND concept IN ('RETEFUENTE', 'RETEICA');
