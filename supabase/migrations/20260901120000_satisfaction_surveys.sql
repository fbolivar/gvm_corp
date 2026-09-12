-- Encuesta de satisfacción y servicio (módulo Servicio al Cliente).
--
-- Una fila = una persona que responde. Una misma empresa puede tener varias
-- respuestas (gerente, jefe de compras, veterinario...) y cada una lleva
-- `role_weight` (1–5) según cuánto pesa ese cargo en la decisión de compra: el
-- consolidado de la empresa promedia ponderando por ese peso.
--
-- Las respuestas se guardan como texto (EXCELENTE, REGULAR...) para conservar el
-- matiz de cada escala — incluidas las opciones que NO puntúan ("No aplica") —
-- y los puntajes 0–100 se calculan en la aplicación
-- (src/features/support/utils/surveyScoring.ts) y se persisten para reportería.

CREATE TABLE IF NOT EXISTS public.satisfaction_surveys (
    id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id           uuid NOT NULL DEFAULT get_my_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
    party_id            uuid NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,

    -- Quién responde
    respondent_name     text NOT NULL,
    respondent_role     text NOT NULL,
    role_weight         smallint NOT NULL DEFAULT 3 CHECK (role_weight BETWEEN 1 AND 5),
    tenure              text NOT NULL CHECK (tenure IN ('LT_6M', 'M6_12', 'Y1_3', 'GT_3Y')),
    survey_date         date NOT NULL DEFAULT current_date,

    -- Atención y servicio
    service_attention   text NOT NULL CHECK (service_attention IN ('EXCELENTE','BUENA','REGULAR','MALA','MUY_MALA')),
    contact_ease        text NOT NULL CHECK (contact_ease IN ('MUY_FACIL','FACIL','REGULAR','DIFICIL','MUY_DIFICIL')),
    response_time       text NOT NULL CHECK (response_time IN ('EXCELENTE','BUENO','REGULAR','MALO','MUY_MALO')),
    info_clarity        text NOT NULL CHECK (info_clarity IN ('EXCELENTE','BUENA','REGULAR','MALA','MUY_MALA')),
    timely_resolution   text NOT NULL CHECK (timely_resolution IN ('SIEMPRE','CASI_SIEMPRE','ALGUNAS_VECES','RARA_VEZ','NUNCA')),

    -- Pedidos y entregas
    order_process       text NOT NULL CHECK (order_process IN ('EXCELENTE','BUENO','REGULAR','MALO','MUY_MALO')),
    delivery_time       text NOT NULL CHECK (delivery_time IN ('EXCELENTE','BUENO','REGULAR','MALO','MUY_MALO','NO_APLICA')),
    product_condition   text NOT NULL CHECK (product_condition IN ('EXCELENTE','BUENO','REGULAR','MALO','MUY_MALO','NO_APLICA')),
    issue_frequency     text NOT NULL CHECK (issue_frequency IN ('NUNCA','RARA_VEZ','ALGUNAS_VECES','FRECUENTEMENTE','MUY_FRECUENTEMENTE')),

    -- Producto y solución de necesidades
    product_availability text NOT NULL CHECK (product_availability IN ('EXCELENTE','BUENA','REGULAR','MALA','MUY_MALA')),
    product_quality      text NOT NULL CHECK (product_quality IN ('MUY_SATISFECHO','SATISFECHO','NEUTRAL','INSATISFECHO','MUY_INSATISFECHO')),
    needs_understanding  text NOT NULL CHECK (needs_understanding IN ('TOTALMENTE','EN_GRAN_MEDIDA','PARCIALMENTE','POCO','NADA')),

    -- Experiencia general
    issue_handling      text NOT NULL CHECK (issue_handling IN ('EXCELENTE','BUENA','REGULAR','MALA','MUY_MALA','SIN_INCONVENIENTES')),
    csat                smallint NOT NULL CHECK (csat BETWEEN 1 AND 10),
    nps                 smallint NOT NULL CHECK (nps BETWEEN 0 AND 10),
    main_strength       text NOT NULL CHECK (main_strength IN ('ATENCION','TIEMPO_RESPUESTA','CALIDAD','DISPONIBILIDAD','CUMPLIMIENTO','PRECIO','ASESORIA','OTRO')),
    main_strength_other text,
    improvement_area    text NOT NULL CHECK (improvement_area IN ('ATENCION','TIEMPO_RESPUESTA','COMUNICACION','DISPONIBILIDAD','TIEMPOS_ENTREGA','PROCESO_PEDIDOS','FACTURACION','POSVENTA','OTRO')),
    improvement_other   text,
    recommendation      text,

    -- Puntajes 0–100 calculados al guardar (ver surveyScoring.ts)
    score_service       numeric(5,2),
    score_orders        numeric(5,2),
    score_product       numeric(5,2),
    overall_score       numeric(5,2),

    created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_tenant
    ON public.satisfaction_surveys(tenant_id, survey_date DESC);
CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_party
    ON public.satisfaction_surveys(party_id, survey_date DESC);

-- Una misma persona no debe quedar cargada dos veces para la misma empresa y
-- fecha: sería un doble clic inflando el consolidado de esa empresa.
CREATE UNIQUE INDEX IF NOT EXISTS satisfaction_surveys_respondent_uniq
    ON public.satisfaction_surveys (tenant_id, party_id, lower(respondent_name), survey_date);

ALTER TABLE public.satisfaction_surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS satisfaction_surveys_tenant ON public.satisfaction_surveys;
CREATE POLICY satisfaction_surveys_tenant ON public.satisfaction_surveys
    FOR ALL
    USING (tenant_id = get_my_tenant_id())
    WITH CHECK (tenant_id = get_my_tenant_id());

COMMENT ON TABLE public.satisfaction_surveys IS
    'Encuestas de satisfacción y servicio. Una fila por persona encuestada; varias por empresa, ponderadas por role_weight (1-5) según el cargo.';
COMMENT ON COLUMN public.satisfaction_surveys.role_weight IS
    'Peso del cargo en la decisión de compra (1 informativo … 5 decisor principal). Pondera el consolidado de la empresa.';
COMMENT ON COLUMN public.satisfaction_surveys.overall_score IS
    'Promedio 0-100 de las preguntas de escala contestadas. Las opciones "No aplica" se excluyen.';

-- PostgREST necesita una FK directa a public.profiles para resolver el embed
-- author:profiles(full_name) del servicio: la FK a auth.users no le sirve porque
-- no atraviesa esquemas. Mismo patrón que support_tickets_assigned_to_profiles_fkey.
ALTER TABLE public.satisfaction_surveys
    DROP CONSTRAINT IF EXISTS satisfaction_surveys_created_by_profiles_fkey;

ALTER TABLE public.satisfaction_surveys
    ADD CONSTRAINT satisfaction_surveys_created_by_profiles_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
