-- Observaciones finales del documento.
-- Se registran cuando el pedido ya está en estado final (facturado / ACCEPTED)
-- y se imprimen al final del PDF del pedido.

ALTER TABLE public.documents
    ADD COLUMN IF NOT EXISTS final_notes    text,
    ADD COLUMN IF NOT EXISTS final_notes_at timestamptz,
    ADD COLUMN IF NOT EXISTS final_notes_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.documents.final_notes IS
    'Observaciones finales — se escriben cuando el documento ya está cerrado (pedido facturado). Se imprimen en el PDF.';
COMMENT ON COLUMN public.documents.final_notes_at IS 'Fecha de la última edición de las observaciones finales.';
COMMENT ON COLUMN public.documents.final_notes_by IS 'Usuario que registró las observaciones finales.';
