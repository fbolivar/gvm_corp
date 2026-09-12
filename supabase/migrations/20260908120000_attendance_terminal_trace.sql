-- Traza de en qué terminal se marcó la entrada y la salida.
--
-- El kiosco validaba el terminal (token, vigencia, empresa) pero no guardaba
-- cuál se usó: marcar en La Ceja, en Bogotá o en Fómeque producía exactamente
-- la misma fila. No había forma de saber dónde se autenticó el carnet.
--
-- Son dos columnas y no una porque la jornada puede empezar en una sede y
-- terminar en otra: quien entra en La Ceja y sale en Bogotá debe quedar
-- registrado así, no como si hubiera estado todo el día en un solo sitio.

ALTER TABLE public.payroll_attendance
    ADD COLUMN IF NOT EXISTS check_in_terminal_id  uuid REFERENCES public.kiosk_terminals(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS check_out_terminal_id uuid REFERENCES public.kiosk_terminals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_check_in_terminal
    ON public.payroll_attendance(check_in_terminal_id)
    WHERE check_in_terminal_id IS NOT NULL;

COMMENT ON COLUMN public.payroll_attendance.check_in_terminal_id IS
    'Terminal QR donde se marcó la entrada. Nulo en registros manuales o anteriores a esta traza.';
COMMENT ON COLUMN public.payroll_attendance.check_out_terminal_id IS
    'Terminal QR donde se marcó la salida. Puede ser distinto al de entrada.';
