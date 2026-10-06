-- Encuesta a proveedores (módulo Compras) — espejo de satisfaction_surveys
-- (encuesta de clientes): aquí es el PROVEEDOR quien califica a GVM como
-- comprador, no al revés.
--
-- Una fila = una persona que responde por el proveedor. Una misma empresa
-- puede tener varias respuestas (gerente, jefe comercial...) y cada una lleva
-- `role_weight` (1–5) según cuánto pesa ese cargo en la relación comercial: el
-- consolidado se promedia ponderando por ese peso, igual que en clientes.

CREATE TABLE IF NOT EXISTS public.vendor_satisfaction_surveys (
    id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           uuid NOT NULL DEFAULT get_my_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
    party_id            uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,

    -- Quién responde
    respondent_name     text NOT NULL,
    respondent_role     text NOT NULL,
    role_weight         smallint NOT NULL DEFAULT 3 CHECK (role_weight BETWEEN 1 AND 5),
    tenure              text NOT NULL CHECK (tenure IN ('LT_6M', 'M6_12', 'Y1_3', 'GT_3Y')),
    survey_date         date NOT NULL DEFAULT current_date,

    -- Relación comercial y comunicación
    buying_team_attention text NOT NULL CHECK (buying_team_attention IN ('EXCELENTE','BUENA','REGULAR','MALA','MUY_MALA')),
    contact_ease          text NOT NULL CHECK (contact_ease IN ('MUY_FACIL','FACIL','REGULAR','DIFICIL','MUY_DIFICIL')),
    response_time         text NOT NULL CHECK (response_time IN ('EXCELENTE','BUENO','REGULAR','MALO','MUY_MALO')),
    po_clarity             text NOT NULL CHECK (po_clarity IN ('EXCELENTE','BUENA','REGULAR','MALA','MUY_MALA')),
    timely_resolution     text NOT NULL CHECK (timely_resolution IN ('SIEMPRE','CASI_SIEMPRE','ALGUNAS_VECES','RARA_VEZ','NUNCA')),

    -- Pedidos y pagos
    order_process        text NOT NULL CHECK (order_process IN ('EXCELENTE','BUENO','REGULAR','MALO','MUY_MALO')),
    payment_timeliness   text NOT NULL CHECK (payment_timeliness IN ('EXCELENTE','BUENO','REGULAR','MALO','MUY_MALO','NO_APLICA')),
    receiving_compliance text NOT NULL CHECK (receiving_compliance IN ('EXCELENTE','BUENO','REGULAR','MALO','MUY_MALO','NO_APLICA')),
    issue_frequency      text NOT NULL CHECK (issue_frequency IN ('NUNCA','RARA_VEZ','ALGUNAS_VECES','FRECUENTEMENTE','MUY_FRECUENTEMENTE')),

    -- Condiciones comerciales
    price_competitiveness         text NOT NULL CHECK (price_competitiveness IN ('EXCELENTE','BUENA','REGULAR','MALA','MUY_MALA')),
    purchase_volume_satisfaction  text NOT NULL CHECK (purchase_volume_satisfaction IN ('MUY_SATISFECHO','SATISFECHO','NEUTRAL','INSATISFECHO','MUY_INSATISFECHO')),
    needs_understanding           text NOT NULL CHECK (needs_understanding IN ('TOTALMENTE','EN_GRAN_MEDIDA','PARCIALMENTE','POCO','NADA')),

    -- Experiencia general
    issue_handling      text NOT NULL CHECK (issue_handling IN ('EXCELENTE','BUENA','REGULAR','MALA','MUY_MALA','SIN_INCONVENIENTES')),
    csat                smallint NOT NULL CHECK (csat BETWEEN 1 AND 10),
    nps                 smallint NOT NULL CHECK (nps BETWEEN 0 AND 10),
    main_strength       text NOT NULL CHECK (main_strength IN ('ATENCION','TIEMPO_PAGO','CLARIDAD_OC','VOLUMEN','CUMPLIMIENTO','COMUNICACION','PRECIO','OTRO')),
    main_strength_other text,
    improvement_area    text NOT NULL CHECK (improvement_area IN ('TIEMPO_PAGO','COMUNICACION','CLARIDAD_OC','RECEPCION','CONDICIONES','ATENCION','OTRO')),
    improvement_other   text,
    recommendation      text,

    -- Puntajes 0–100 calculados al guardar (ver vendorSurveyScoring.ts)
    score_relationship     numeric(5,2),
    score_orders_payments  numeric(5,2),
    score_commercial       numeric(5,2),
    overall_score           numeric(5,2),

    created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_satisfaction_surveys_tenant
    ON public.vendor_satisfaction_surveys(tenant_id, survey_date DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_satisfaction_surveys_party
    ON public.vendor_satisfaction_surveys(party_id, survey_date DESC);

-- Una misma persona no debe quedar cargada dos veces para el mismo proveedor y
-- fecha: sería un doble clic inflando el consolidado de esa empresa.
CREATE UNIQUE INDEX IF NOT EXISTS vendor_satisfaction_surveys_respondent_uniq
    ON public.vendor_satisfaction_surveys (tenant_id, party_id, lower(respondent_name), survey_date);

ALTER TABLE public.vendor_satisfaction_surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vendor_satisfaction_surveys_tenant ON public.vendor_satisfaction_surveys;
CREATE POLICY vendor_satisfaction_surveys_tenant ON public.vendor_satisfaction_surveys
    FOR ALL
    USING (tenant_id = get_my_tenant_id())
    WITH CHECK (tenant_id = get_my_tenant_id());

COMMENT ON TABLE public.vendor_satisfaction_surveys IS
    'Encuesta a proveedores: el proveedor califica a GVM como comprador. Espejo de satisfaction_surveys (encuesta de clientes). Una fila por persona encuestada; varias por proveedor, ponderadas por role_weight (1-5).';
COMMENT ON COLUMN public.vendor_satisfaction_surveys.role_weight IS
    'Peso del cargo en la decisión comercial del proveedor (1 informativo … 5 decisor principal). Pondera el consolidado.';
COMMENT ON COLUMN public.vendor_satisfaction_surveys.overall_score IS
    'Promedio 0-100 de las preguntas de escala contestadas. Las opciones "No aplica" se excluyen.';

-- PostgREST necesita una FK directa a public.profiles para resolver el embed
-- author:profiles(full_name) del servicio: la FK a auth.users no le sirve
-- porque no atraviesa esquemas. Mismo patrón que satisfaction_surveys.
ALTER TABLE public.vendor_satisfaction_surveys
    DROP CONSTRAINT IF EXISTS vendor_satisfaction_surveys_created_by_profiles_fkey;

ALTER TABLE public.vendor_satisfaction_surveys
    ADD CONSTRAINT vendor_satisfaction_surveys_created_by_profiles_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
