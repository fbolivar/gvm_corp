-- Turno flexible (sin hora fija) para comerciales y socios.
--
-- Esas personas no tienen horario de oficina: marcan para dejar traza de la
-- sede y la jornada, pero medirles retardo contra una hora de entrada o
-- calcularles horas extra contra una jornada esperada sería inventar un dato.
-- Con `is_flexible` el motor registra la marcación y calcula horas trabajadas,
-- pero nunca marca LATE ni horas extra.
ALTER TABLE public.work_schedules
    ADD COLUMN IF NOT EXISTS is_flexible boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.work_schedules.is_flexible IS
    'Turno sin hora fija (comerciales, socios): la marcación deja traza pero no genera retardo ni horas extra.';
