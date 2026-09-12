-- EPS y ARL del empleado: se imprimen en el frente del carnet corporativo.
-- No existían en ninguna tabla (solo estaba risk_level, que es el nivel de riesgo
-- ARL, no la administradora).

ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS eps_name text,
    ADD COLUMN IF NOT EXISTS arl_name text;

COMMENT ON COLUMN public.employees.eps_name IS 'EPS a la que está afiliado el empleado (se imprime en el carnet).';
COMMENT ON COLUMN public.employees.arl_name IS 'ARL a la que está afiliado el empleado (se imprime en el carnet).';
