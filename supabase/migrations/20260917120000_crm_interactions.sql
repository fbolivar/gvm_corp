-- Interacciones rápidas con el cliente (CRM): llamada, WhatsApp, correo o nota.
--
-- Se crean al tocar los botones de contacto (registro automático del canal)
-- y el comercial puede añadir en una línea "qué pasó". Es el historial ligero
-- entre visitas; una visita formal sigue viviendo en crm_visits.

CREATE TABLE IF NOT EXISTS public.crm_interactions (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   uuid NOT NULL DEFAULT get_my_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
    party_id    uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    channel     text NOT NULL CHECK (channel IN ('CALL','WHATSAPP','EMAIL','NOTE')),
    template    text,                      -- clave de la plantilla de WhatsApp usada, si aplica
    note        text,                      -- "qué pasó", opcional
    visit_id    uuid REFERENCES public.crm_visits(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_interactions_party ON public.crm_interactions(party_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_user ON public.crm_interactions(tenant_id, user_id, created_at DESC);

ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;

-- Todos los del tenant leen (el gerente ve el historial completo del cliente);
-- cada quien escribe SOLO a su nombre y solo edita/borra lo suyo.
DROP POLICY IF EXISTS crm_interactions_read ON public.crm_interactions;
DROP POLICY IF EXISTS crm_interactions_insert ON public.crm_interactions;
DROP POLICY IF EXISTS crm_interactions_own ON public.crm_interactions;
CREATE POLICY crm_interactions_read ON public.crm_interactions
    FOR SELECT USING (tenant_id = get_my_tenant_id());
CREATE POLICY crm_interactions_insert ON public.crm_interactions
    FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id() AND (auth.uid() IS NULL OR user_id = auth.uid()));
CREATE POLICY crm_interactions_own ON public.crm_interactions
    FOR UPDATE USING (tenant_id = get_my_tenant_id() AND (auth.uid() IS NULL OR user_id = auth.uid()))
    WITH CHECK (tenant_id = get_my_tenant_id() AND (auth.uid() IS NULL OR user_id = auth.uid()));
CREATE POLICY crm_interactions_delete ON public.crm_interactions
    FOR DELETE USING (tenant_id = get_my_tenant_id() AND (auth.uid() IS NULL OR user_id = auth.uid()));

COMMENT ON TABLE public.crm_interactions IS 'Contactos rápidos con clientes (llamada, WhatsApp, correo, nota) registrados desde el CRM.';
