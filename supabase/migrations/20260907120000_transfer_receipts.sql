-- Recepción de traslados pieza por pieza (lote, vencimiento y cantidad).
--
-- Antes la recepción solo guardaba `qty_received` en la línea del traslado: se
-- sabía CUÁNTO llegó, no QUÉ llegó. Sin lote ni vencimiento no hay trazabilidad
-- ni despacho FEFO en la bodega de destino.
--
-- Una línea del traslado puede recibirse en varios renglones: dos lotes
-- distintos del mismo producto, o una recepción parcial hoy y el resto mañana.
-- Por eso es una tabla aparte y no columnas en `warehouse_transfer_lines`.

CREATE TABLE IF NOT EXISTS public.warehouse_transfer_receipts (
    id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           uuid NOT NULL DEFAULT get_my_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
    transfer_id         uuid NOT NULL REFERENCES public.warehouse_transfers(id) ON DELETE CASCADE,
    transfer_line_id    uuid NOT NULL REFERENCES public.warehouse_transfer_lines(id) ON DELETE CASCADE,

    -- Denormalizado: permite consultar recepciones por producto sin pasar por la
    -- línea, y sobrevive si la línea se reescribe. Nulo en ítems de texto libre.
    product_id          uuid REFERENCES public.products(id) ON DELETE SET NULL,

    -- Lote y vencimiento tal como vienen en la planilla de bodega.
    lot_number          text,
    expiration_date     date,
    qty                 numeric(18,4) NOT NULL CHECK (qty > 0),
    notes               text,

    -- Lotes creados/afectados en cada bodega, para poder rastrear el movimiento.
    lot_id_to           uuid REFERENCES public.product_lots(id) ON DELETE SET NULL,
    lot_id_from         uuid REFERENCES public.product_lots(id) ON DELETE SET NULL,

    received_by         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    received_at         timestamptz NOT NULL DEFAULT now(),
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transfer_receipts_transfer
    ON public.warehouse_transfer_receipts(transfer_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_transfer_receipts_line
    ON public.warehouse_transfer_receipts(transfer_line_id);
CREATE INDEX IF NOT EXISTS idx_transfer_receipts_product
    ON public.warehouse_transfer_receipts(tenant_id, product_id, received_at DESC);

ALTER TABLE public.warehouse_transfer_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS warehouse_transfer_receipts_tenant ON public.warehouse_transfer_receipts;
CREATE POLICY warehouse_transfer_receipts_tenant ON public.warehouse_transfer_receipts
    FOR ALL
    USING (tenant_id = get_my_tenant_id())
    WITH CHECK (tenant_id = get_my_tenant_id());

COMMENT ON TABLE public.warehouse_transfer_receipts IS
    'Detalle de lo recibido en un traslado: un renglón por lote recibido, con vencimiento y cantidad. Alimenta los movimientos de inventario de ambas bodegas.';
COMMENT ON COLUMN public.warehouse_transfer_receipts.expiration_date IS
    'Vencimiento del lote recibido. Es lo que permite el despacho FEFO y las alertas de próximo a vencer en la bodega de destino.';
