-- ============================================================
-- Add warehouse_id to document_lines
-- Required para FEFO al emitir factura (el usuario elige bodega por línea)
-- ============================================================

ALTER TABLE document_lines
  ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id);

CREATE INDEX IF NOT EXISTS idx_document_lines_warehouse
  ON document_lines(warehouse_id);

COMMENT ON COLUMN document_lines.warehouse_id IS
  'Bodega desde donde se despacha el producto. Usado para FEFO al emitir factura.';
