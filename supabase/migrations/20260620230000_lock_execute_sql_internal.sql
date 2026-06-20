-- execute_sql_internal ejecuta SQL directo (SECURITY DEFINER, omite RLS). Ya no
-- la llama ninguna parte del app (Tecnología migró a consultas normales).
-- Se limita a uso de servidor: revocar de PUBLIC/anon/authenticated.
REVOKE EXECUTE ON FUNCTION public.execute_sql_internal(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.execute_sql_internal(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.execute_sql_internal(text) FROM authenticated;
