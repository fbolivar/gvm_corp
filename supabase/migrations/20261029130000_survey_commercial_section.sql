-- Encuestas de satisfacción: nueva sección "Gestión del comercial".
-- Se registra QUÉ comercial atiende la cuenta (salesperson_id → profiles) y un
-- panel de preguntas para evaluar su gestión. El puntaje de esa sección se
-- guarda en score_commercial (0–100), igual que score_service/orders/product.
ALTER TABLE public.satisfaction_surveys
    ADD COLUMN IF NOT EXISTS salesperson_id uuid,
    ADD COLUMN IF NOT EXISTS commercial_visit_frequency text,
    ADD COLUMN IF NOT EXISTS commercial_knowledge text,
    ADD COLUMN IF NOT EXISTS commercial_followup text,
    ADD COLUMN IF NOT EXISTS commercial_responsiveness text,
    ADD COLUMN IF NOT EXISTS commercial_proactivity text,
    ADD COLUMN IF NOT EXISTS score_commercial numeric;

-- FK directa a public.profiles para poder embeber el nombre del comercial en los
-- selects (PostgREST no atraviesa esquemas: una FK a auth.users NO habilita el
-- embed `salesperson:profiles(full_name)`). Mismo patrón que created_by.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'satisfaction_surveys_salesperson_id_profiles_fkey'
    ) THEN
        ALTER TABLE public.satisfaction_surveys
            ADD CONSTRAINT satisfaction_surveys_salesperson_id_profiles_fkey
            FOREIGN KEY (salesperson_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;
