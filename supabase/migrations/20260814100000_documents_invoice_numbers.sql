-- Números de factura (FEV) asociados a un pedido marcado como facturado.
--
-- Un pedido puede facturarse en VARIAS facturas electrónicas (por bodega, por
-- despacho parcial, etc.), por eso es un arreglo y no un solo texto. Se captura
-- manualmente porque la factura suele emitirse por fuera (WorldOffice).

ALTER TABLE public.documents
    ADD COLUMN IF NOT EXISTS invoice_numbers text[];

COMMENT ON COLUMN public.documents.invoice_numbers IS
    'Números de factura electrónica (FEV) asociados al pedido facturado. Captura manual; admite varias.';

-- Búsqueda por número de factura desde el buscador de pedidos.
CREATE INDEX IF NOT EXISTS idx_documents_invoice_numbers
    ON public.documents USING gin (invoice_numbers);
