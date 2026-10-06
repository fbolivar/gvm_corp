-- Asistencia desde "Mi nómina": trabajo fuera de la oficina y salida anticipada.
--
-- Hasta ahora la única entrada "legítima" era el carnet en la tablet. Hay días
-- en que el empleado no puede ir a la oficina (visita a cliente, trabajo en
-- casa, cita médica…): debe poder marcar desde la app dejando el MOTIVO, y ese
-- registro tiene que distinguirse del de la tablet. Y quien sale antes de su
-- hora —haya entrado por tablet o por la app— debe dejar una justificación.

ALTER TABLE public.payroll_attendance
    ADD COLUMN IF NOT EXISTS check_in_mode text NOT NULL DEFAULT 'KIOSK'
        CHECK (check_in_mode IN ('KIOSK', 'REMOTE', 'MANUAL')),
    ADD COLUMN IF NOT EXISTS remote_reason text,
    ADD COLUMN IF NOT EXISTS early_leave_reason text;

COMMENT ON COLUMN public.payroll_attendance.check_in_mode IS
    'KIOSK = carnet en la tablet; REMOTE = desde Mi nómina sin ir a la oficina (lleva remote_reason); MANUAL = cargado por nómina.';
COMMENT ON COLUMN public.payroll_attendance.remote_reason IS
    'Motivo por el que el empleado no fue a la oficina ese día. Obligatorio cuando check_in_mode = REMOTE.';
COMMENT ON COLUMN public.payroll_attendance.early_leave_reason IS
    'Justificación cuando la salida se registra antes de la hora de fin del turno.';

-- Modo APP: entrada normal desde "Mi nómina" para las sedes que no tienen
-- tablet (Bogotá, Fusagasugá, Fómeque). Distinto de REMOTE (no va a la oficina).
ALTER TABLE public.payroll_attendance DROP CONSTRAINT IF EXISTS payroll_attendance_check_in_mode_check;
ALTER TABLE public.payroll_attendance
    ADD CONSTRAINT payroll_attendance_check_in_mode_check
    CHECK (check_in_mode IN ('KIOSK', 'APP', 'REMOTE', 'MANUAL'));
