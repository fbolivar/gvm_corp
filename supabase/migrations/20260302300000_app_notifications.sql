-- Migration: 20260302300000_app_notifications
-- Centro de notificaciones y alertas del sistema
-- Usa IF NOT EXISTS para ser idempotente (la tabla puede existir ya)

CREATE TABLE IF NOT EXISTS app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT,
    category TEXT NOT NULL DEFAULT 'GENERAL',
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;

-- Política: el usuario ve sus propias notificaciones o las del tenant sin user_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'app_notifications' AND policyname = 'user_notifications'
  ) THEN
    CREATE POLICY "user_notifications" ON app_notifications
      FOR SELECT USING (
        user_id = auth.uid() OR
        (user_id IS NULL AND tenant_id = get_my_tenant_id())
      );
  END IF;
END $$;

-- Política: insertar notificaciones dentro del tenant
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'app_notifications' AND policyname = 'tenant_insert_notifications'
  ) THEN
    CREATE POLICY "tenant_insert_notifications" ON app_notifications
      FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());
  END IF;
END $$;

-- Política: actualizar (marcar como leída) notificaciones propias o del tenant
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'app_notifications' AND policyname = 'user_update_notifications'
  ) THEN
    CREATE POLICY "user_update_notifications" ON app_notifications
      FOR UPDATE USING (user_id = auth.uid() OR tenant_id = get_my_tenant_id());
  END IF;
END $$;

-- Política: eliminar notificaciones propias o del tenant
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'app_notifications' AND policyname = 'user_delete_notifications'
  ) THEN
    CREATE POLICY "user_delete_notifications" ON app_notifications
      FOR DELETE USING (user_id = auth.uid() OR tenant_id = get_my_tenant_id());
  END IF;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user ON app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON app_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON app_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON app_notifications(created_at DESC);
