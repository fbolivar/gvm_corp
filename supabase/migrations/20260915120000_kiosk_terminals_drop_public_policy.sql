-- La migración 20260316980000 creó la política SELECT `USING (true)` "para que
-- el portal leyera por token". RLS filtra FILAS, no parámetros: esa política
-- habría permitido a cualquier usuario autenticado de OTRA empresa listar los
-- tokens de todos los terminales. En producción ya no existe (la retiró el
-- hardening posterior), pero el archivo original la seguiría recreando en un
-- esquema nuevo. Se elimina de forma explícita e idempotente.
--
-- El portal público lee el terminal con el admin client (salta RLS), así que
-- nunca necesitó esta política.
DROP POLICY IF EXISTS "kiosk_public_read_by_token" ON public.kiosk_terminals;

-- El rol anónimo no debe tener ningún privilegio sobre la tabla de tokens.
REVOKE ALL ON public.kiosk_terminals FROM anon;
