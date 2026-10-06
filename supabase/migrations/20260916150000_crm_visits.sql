-- Planeador de visitas comerciales (módulo CRM).
--
-- Reemplaza el Excel "PLANEADOR VISITAS GVM.xlsx": una fila por visita
-- planeada por un comercial a un cliente. El cliente sale SIEMPRE del maestro
-- de terceros (party_id) para poder cruzar con ventas reales; las gestiones que
-- no son a un cliente (día de oficina, capacitación interna) se marcan con
-- is_internal = true y llevan solo un título.
--
-- Los catálogos (tipo de gestión, tipo de reunión, estado, resultado) se
-- guardan como códigos en mayúsculas y se validan con CHECK; las etiquetas en
-- español viven en src/features/crm/types/visits.ts.

CREATE TABLE IF NOT EXISTS public.crm_visits (
    id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           uuid NOT NULL DEFAULT get_my_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Quién visita y a quién
    salesperson_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    party_id            uuid REFERENCES public.parties(id) ON DELETE SET NULL,
    is_internal         boolean NOT NULL DEFAULT false,
    title               text,                       -- solo para actividades internas

    -- Planeación
    priority            smallint NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
    management_type     text NOT NULL CHECK (management_type IN (
                            'REACTIVACION','RECUPERACION','FIDELIZACION','DESARROLLO',
                            'CONSOLIDACION','PROSPECCION','COBRANZA','CAPACITACION_TECNICA','INTERNA')),
    objective           text NOT NULL,
    meeting_type        text NOT NULL CHECK (meeting_type IN ('OFICINA','GRANJA','VIRTUAL')),
    planned_date        date NOT NULL,

    -- Seguimiento
    status              text NOT NULL DEFAULT 'PENDIENTE' CHECK (status IN (
                            'PENDIENTE','AGENDADA','REALIZADA','REPROGRAMADA','NO_REALIZADA')),
    done_date           date,
    conclusions         text,
    commitments         text,
    next_followup_date  date,
    result              text CHECK (result IS NULL OR result IN (
                            'CUENTA_RECUPERADA','PEDIDO_CERRADO','EN_PROCESO','SIN_AVANCE','CUENTA_PERDIDA')),

    created_by          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    -- Una visita a cliente necesita el cliente; una interna necesita título.
    CONSTRAINT crm_visits_target_chk CHECK (
        (is_internal = false AND party_id IS NOT NULL) OR
        (is_internal = true AND title IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_crm_visits_tenant_date
    ON public.crm_visits(tenant_id, planned_date DESC);
CREATE INDEX IF NOT EXISTS idx_crm_visits_salesperson
    ON public.crm_visits(salesperson_id, planned_date DESC);
CREATE INDEX IF NOT EXISTS idx_crm_visits_party
    ON public.crm_visits(party_id, planned_date DESC);

ALTER TABLE public.crm_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_visits_tenant ON public.crm_visits;
CREATE POLICY crm_visits_tenant ON public.crm_visits
    FOR ALL
    USING (tenant_id = get_my_tenant_id())
    WITH CHECK (tenant_id = get_my_tenant_id());

-- updated_at automático (misma función que crm_opportunities).
DROP TRIGGER IF EXISTS trg_crm_visits_updated_at ON public.crm_visits;
CREATE TRIGGER trg_crm_visits_updated_at
    BEFORE UPDATE ON public.crm_visits
    FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();

COMMENT ON TABLE public.crm_visits IS
    'Planeador de visitas comerciales: una fila por visita planeada/realizada a un cliente (o actividad interna).';
COMMENT ON COLUMN public.crm_visits.priority IS '1 = cuenta crítica, 2 = media, 3 = baja.';
COMMENT ON COLUMN public.crm_visits.is_internal IS 'true = actividad que no es visita a cliente (oficina, capacitación interna).';
