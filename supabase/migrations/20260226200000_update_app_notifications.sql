-- Script para asegurar que las columnas existen en app_notifications
-- Esto repara el Error 400 Bad Request en el frontend

ALTER TABLE app_notifications 
    ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'GENERAL',
    ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'MEDIUM',
    ADD COLUMN IF NOT EXISTS link TEXT,
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS body TEXT,
    ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Asegurar políticas
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation Notifications" ON app_notifications;
CREATE POLICY "Tenant Isolation Notifications" ON app_notifications USING (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
);

-- Hacer que los roles de servicio o admin puedan instertar si fuera necesario
-- Para que `critical_alerts` también tengan permisos, etc.
