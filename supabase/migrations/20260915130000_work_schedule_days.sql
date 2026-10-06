-- Horario por día de la semana.
--
-- `work_schedules` guarda UNA hora de entrada y salida para todos los días,
-- pero los turnos reales de Entrerríos cambian según el día: el viernes se sale
-- antes y hay quien entra a las 7:30 de martes a jueves y a las 8:00 lunes y
-- viernes. Con un solo horario, o se marcaba retardo a quien llegaba a su hora,
-- o se dejaba de detectar el retardo real.
--
-- Una fila por (turno, día) SOLO cuando ese día difiere del horario base. Si no
-- hay fila, aplica start_time/end_time de `work_schedules`.

CREATE TABLE IF NOT EXISTS public.work_schedule_days (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   uuid NOT NULL DEFAULT get_my_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
    schedule_id uuid NOT NULL REFERENCES public.work_schedules(id) ON DELETE CASCADE,
    -- 0 = domingo … 6 = sábado (mismo criterio que JavaScript / bogotaWeekday)
    weekday     smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    start_time  text NOT NULL,
    end_time    text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (schedule_id, weekday)
);

CREATE INDEX IF NOT EXISTS idx_work_schedule_days_schedule
    ON public.work_schedule_days(schedule_id);

ALTER TABLE public.work_schedule_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS work_schedule_days_tenant ON public.work_schedule_days;
CREATE POLICY work_schedule_days_tenant ON public.work_schedule_days
    FOR ALL
    USING (tenant_id = get_my_tenant_id())
    WITH CHECK (tenant_id = get_my_tenant_id());

COMMENT ON TABLE public.work_schedule_days IS
    'Excepciones por día de la semana a un turno (work_schedules). Sin fila para un día, aplica el horario base del turno.';
