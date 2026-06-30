-- Fichas técnicas por producto (documentos técnicos). Solo equipo interno.
CREATE TABLE IF NOT EXISTS public.product_datasheets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name text NOT NULL,
    file_path text NOT NULL,
    mime text,
    size bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_product_datasheets_product_id ON public.product_datasheets(product_id);
CREATE INDEX IF NOT EXISTS idx_product_datasheets_tenant_id ON public.product_datasheets(tenant_id);

ALTER TABLE public.product_datasheets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_datasheets_tenant ON public.product_datasheets;
CREATE POLICY product_datasheets_tenant ON public.product_datasheets
    FOR ALL
    USING (tenant_id = (SELECT get_my_tenant_id()))
    WITH CHECK (tenant_id = (SELECT get_my_tenant_id()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_datasheets TO authenticated, service_role;

-- Bucket privado para los documentos técnicos (acceso vía signed URL desde el servidor)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-datasheets', 'product-datasheets', false)
ON CONFLICT (id) DO NOTHING;
