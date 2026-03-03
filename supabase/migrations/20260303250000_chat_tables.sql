-- ─── Módulo: Chat / Colaboración en Tiempo Real ─────────────────────────────
-- Fecha: 2026-03-03
-- Descripción: Tablas para mensajería interna corporativa con canales, mensajes,
--              reacciones y gestión de miembros. Alineado exactamente con:
--              src/features/collaboration/services/chatService.ts
--              src/features/collaboration/types/index.ts
--
-- NOTA: chat_channels y chat_messages ya existen parcialmente en la DB remota
-- (creadas por una migración anterior incompleta). Este archivo usa ADD COLUMN
-- IF NOT EXISTS y CREATE TABLE IF NOT EXISTS para ser completamente idempotente.
-- ─────────────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. TABLA: chat_channels (ya existe — agregar columnas faltantes)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_channels (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        TEXT,
    description TEXT,
    type        TEXT        NOT NULL DEFAULT 'public'
                CHECK (type IN ('public', 'private', 'direct')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agregar columna created_by si no existe (puede haberse omitido en la versión parcial)
ALTER TABLE chat_channels
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON TABLE  chat_channels           IS 'Canales de mensajería interna por tenant';
COMMENT ON COLUMN chat_channels.type      IS 'public|private|direct';
COMMENT ON COLUMN chat_channels.name      IS 'NULL permitido para canales direct';

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. TABLA: chat_channel_members
-- Contiene last_read_at requerido por el tipo ChatMember del frontend.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_channel_members (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id   UUID        NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id      UUID        NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
    role         TEXT        NOT NULL DEFAULT 'member'
                 CHECK (role IN ('admin', 'member')),
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (channel_id, user_id)
);

COMMENT ON TABLE  chat_channel_members              IS 'Miembros de cada canal y su estado de lectura';
COMMENT ON COLUMN chat_channel_members.last_read_at IS 'Marca de tiempo del último mensaje leído por el usuario en este canal';

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. TABLA: chat_messages (ya existe — agregar columnas faltantes)
-- file_url, file_name, file_type son requeridos por handleFileSelect en
-- ChatInterface.tsx. metadata y updated_at son opcionales pero necesarios.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id   UUID        NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    sender_id    UUID        NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
    content      TEXT,
    message_type TEXT        NOT NULL DEFAULT 'text'
                 CHECK (message_type IN ('text', 'file', 'system')),
    file_url     TEXT,
    file_name    TEXT,
    file_type    TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agregar columnas faltantes si no existen
ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS metadata   JSONB,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

COMMENT ON TABLE  chat_messages              IS 'Mensajes de los canales de colaboración';
COMMENT ON COLUMN chat_messages.sender_id    IS 'FK a auth.users. PostgREST usa profiles!sender_id para join con tabla profiles';
COMMENT ON COLUMN chat_messages.file_url     IS 'URL pública del archivo en Supabase Storage (bucket: chat-files)';
COMMENT ON COLUMN chat_messages.message_type IS 'text|file|system';

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. TABLA: chat_reactions
-- Nombre exacto usado en chatService.ts: .from('chat_reactions')
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_reactions (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID        NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
    emoji      TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (message_id, user_id, emoji)
);

COMMENT ON TABLE chat_reactions IS 'Reacciones de emoji a mensajes (max 1 por usuario/emoji/mensaje)';

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. ÍNDICES
-- ──────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_chat_channels_tenant
    ON chat_channels(tenant_id);

CREATE INDEX IF NOT EXISTS idx_chat_channels_updated_at
    ON chat_channels(tenant_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_members_channel
    ON chat_channel_members(channel_id);

CREATE INDEX IF NOT EXISTS idx_chat_members_user
    ON chat_channel_members(user_id);

-- Índice principal para paginación de mensajes (DESC = más recientes primero)
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created
    ON chat_messages(channel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_reactions_message
    ON chat_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_chat_reactions_user
    ON chat_reactions(user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. TRIGGER: actualizar updated_at automáticamente
-- trg_set_updated_at ya existe desde 20260303230000_purchase_orders.sql.
-- CREATE OR REPLACE es idempotente.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- Triggers de updated_at (solo si no existen para evitar duplicados)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_chat_channels_updated_at'
          AND tgrelid = 'chat_channels'::regclass
    ) THEN
        CREATE TRIGGER trg_chat_channels_updated_at
            BEFORE UPDATE ON chat_channels
            FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_chat_messages_updated_at'
          AND tgrelid = 'chat_messages'::regclass
    ) THEN
        CREATE TRIGGER trg_chat_messages_updated_at
            BEFORE UPDATE ON chat_messages
            FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
    END IF;
END
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY
-- Aislamiento por tenant usando get_my_tenant_id() (SECURITY DEFINER existente).
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE chat_channels        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reactions       ENABLE ROW LEVEL SECURITY;

-- ── chat_channels ─────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_channels' AND policyname = 'chat_channels_select') THEN
        CREATE POLICY "chat_channels_select" ON chat_channels FOR SELECT
            USING (tenant_id = get_my_tenant_id());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_channels' AND policyname = 'chat_channels_insert') THEN
        CREATE POLICY "chat_channels_insert" ON chat_channels FOR INSERT
            WITH CHECK (tenant_id = get_my_tenant_id());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_channels' AND policyname = 'chat_channels_update') THEN
        CREATE POLICY "chat_channels_update" ON chat_channels FOR UPDATE
            USING  (tenant_id = get_my_tenant_id())
            WITH CHECK (tenant_id = get_my_tenant_id());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_channels' AND policyname = 'chat_channels_delete') THEN
        CREATE POLICY "chat_channels_delete" ON chat_channels FOR DELETE
            USING (tenant_id = get_my_tenant_id() AND created_by = auth.uid());
    END IF;
END
$$;

-- ── chat_channel_members ──────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_channel_members' AND policyname = 'chat_members_select') THEN
        CREATE POLICY "chat_members_select" ON chat_channel_members FOR SELECT
            USING (channel_id IN (SELECT id FROM chat_channels WHERE tenant_id = get_my_tenant_id()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_channel_members' AND policyname = 'chat_members_insert') THEN
        CREATE POLICY "chat_members_insert" ON chat_channel_members FOR INSERT
            WITH CHECK (channel_id IN (SELECT id FROM chat_channels WHERE tenant_id = get_my_tenant_id()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_channel_members' AND policyname = 'chat_members_update') THEN
        CREATE POLICY "chat_members_update" ON chat_channel_members FOR UPDATE
            USING (channel_id IN (SELECT id FROM chat_channels WHERE tenant_id = get_my_tenant_id()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_channel_members' AND policyname = 'chat_members_delete') THEN
        CREATE POLICY "chat_members_delete" ON chat_channel_members FOR DELETE
            USING (channel_id IN (SELECT id FROM chat_channels WHERE tenant_id = get_my_tenant_id()));
    END IF;
END
$$;

-- ── chat_messages ─────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'chat_messages_select') THEN
        CREATE POLICY "chat_messages_select" ON chat_messages FOR SELECT
            USING (channel_id IN (SELECT id FROM chat_channels WHERE tenant_id = get_my_tenant_id()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'chat_messages_insert') THEN
        CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT
            WITH CHECK (
                channel_id IN (SELECT id FROM chat_channels WHERE tenant_id = get_my_tenant_id())
                AND sender_id = auth.uid()
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'chat_messages_update') THEN
        CREATE POLICY "chat_messages_update" ON chat_messages FOR UPDATE
            USING (
                channel_id IN (SELECT id FROM chat_channels WHERE tenant_id = get_my_tenant_id())
                AND sender_id = auth.uid()
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'chat_messages_delete') THEN
        CREATE POLICY "chat_messages_delete" ON chat_messages FOR DELETE
            USING (
                channel_id IN (SELECT id FROM chat_channels WHERE tenant_id = get_my_tenant_id())
                AND sender_id = auth.uid()
            );
    END IF;
END
$$;

-- ── chat_reactions ────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_reactions' AND policyname = 'chat_reactions_select') THEN
        CREATE POLICY "chat_reactions_select" ON chat_reactions FOR SELECT
            USING (
                message_id IN (
                    SELECT m.id FROM chat_messages m
                    JOIN chat_channels c ON c.id = m.channel_id
                    WHERE c.tenant_id = get_my_tenant_id()
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_reactions' AND policyname = 'chat_reactions_insert') THEN
        CREATE POLICY "chat_reactions_insert" ON chat_reactions FOR INSERT
            WITH CHECK (
                user_id = auth.uid()
                AND message_id IN (
                    SELECT m.id FROM chat_messages m
                    JOIN chat_channels c ON c.id = m.channel_id
                    WHERE c.tenant_id = get_my_tenant_id()
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_reactions' AND policyname = 'chat_reactions_delete') THEN
        CREATE POLICY "chat_reactions_delete" ON chat_reactions FOR DELETE
            USING (user_id = auth.uid());
    END IF;
END
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. SEED: Canal General por defecto para cada tenant existente
-- ON CONFLICT DO NOTHING hace el INSERT idempotente.
-- ──────────────────────────────────────────────────────────────────────────────
INSERT INTO chat_channels (tenant_id, name, description, type)
SELECT
    t.id,
    'General',
    'Canal general de la empresa',
    'public'
FROM tenants t
ON CONFLICT DO NOTHING;
