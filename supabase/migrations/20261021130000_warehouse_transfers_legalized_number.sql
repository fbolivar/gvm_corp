-- Número de traslado legalizado: el consecutivo con el que el traslado queda
-- legalizado en el sistema contable de referencia (WorldOffice). Es un dato de
-- referencia que se asigna DESPUÉS de procesar el traslado, por eso es editable
-- en cualquier estado (no solo BORRADOR) y es opcional.
ALTER TABLE public.warehouse_transfers
    ADD COLUMN IF NOT EXISTS legalized_number text;

COMMENT ON COLUMN public.warehouse_transfers.legalized_number IS
    'Número/consecutivo del traslado una vez legalizado en el sistema contable (WorldOffice). Opcional, de referencia.';
