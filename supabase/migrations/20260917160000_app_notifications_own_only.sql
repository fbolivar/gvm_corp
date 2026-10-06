-- Las notificaciones son personales. La política `app_notifications_tenant`
-- (FOR ALL por tenant) se sumaba a las políticas por usuario (permisivas = OR)
-- y hacía que cualquier usuario viera, marcara como leídas y borrara las
-- notificaciones de TODOS sus compañeros: el panel "Alertas críticas" del
-- gerente mostraba "Se te programó una capacitación" dirigida a dos empleados.
--
-- Queda: leer/actualizar/borrar solo las propias o las generales (user_id nulo);
-- insertar cualquiera del tenant (los avisos a otros usuarios los crea la app).
DROP POLICY IF EXISTS app_notifications_tenant ON public.app_notifications;

DROP POLICY IF EXISTS user_update_notifications ON public.app_notifications;
CREATE POLICY user_update_notifications ON public.app_notifications
    FOR UPDATE
    USING (user_id = (SELECT auth.uid()) OR (user_id IS NULL AND tenant_id = (SELECT get_my_tenant_id())))
    WITH CHECK (user_id = (SELECT auth.uid()) OR (user_id IS NULL AND tenant_id = (SELECT get_my_tenant_id())));

DROP POLICY IF EXISTS user_delete_notifications ON public.app_notifications;
CREATE POLICY user_delete_notifications ON public.app_notifications
    FOR DELETE
    USING (user_id = (SELECT auth.uid()) OR (user_id IS NULL AND tenant_id = (SELECT get_my_tenant_id())));
