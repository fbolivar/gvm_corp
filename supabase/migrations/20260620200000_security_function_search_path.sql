-- Seguridad: fijar search_path en funciones marcadas por el linter (anti-hijack).
ALTER FUNCTION public._plan_monthly_price(text) SET search_path = public;
ALTER FUNCTION public._puc_level_from_code(text) SET search_path = public;
ALTER FUNCTION public._puc_nature_from_class(text) SET search_path = public;
ALTER FUNCTION public.get_pending_logistics_orders() SET search_path = public;
ALTER FUNCTION public.get_pending_orders_count() SET search_path = public;
ALTER FUNCTION public.get_logistics_dashboard_stats() SET search_path = public;
