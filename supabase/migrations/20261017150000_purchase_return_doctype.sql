-- Devolución a proveedor (DMP): nuevo tipo de documento.
-- Antes la "devolución de compra" se guardaba como CREDIT_NOTE (doc_type de las
-- notas crédito de VENTA), sin líneas, sin mover inventario y sin asiento. Se crea
-- un doc_type propio para poder: llevar líneas, descargar inventario y generar el
-- asiento con las reglas DMP ya validadas por el contador.
--
-- ADD VALUE va en su propia migración (no se puede usar un valor de enum nuevo en
-- la misma transacción que lo crea).
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'PURCHASE_RETURN';
