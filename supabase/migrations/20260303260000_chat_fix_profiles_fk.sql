-- ─── Fix: chat_messages sender_id FK → profiles (para PostgREST join) ────────
-- Fecha: 2026-03-03
-- Problema: PostgREST no puede resolver profiles!sender_id porque la FK apunta
--           a auth.users (esquema oculto). Solución: reemplazar la FK por una
--           que apunte a public.profiles (profiles.id = auth.users.id, es 1:1).
-- Efecto: habilita la query  .select('*, sender:profiles!sender_id(...)')
--         que usa chatService.ts en getMessages().
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Eliminar la FK existente que apunta a auth.users
ALTER TABLE chat_messages
    DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;

-- 2. Crear la nueva FK que apunta a public.profiles
--    ON DELETE SET NULL: si se elimina el perfil, el mensaje queda pero sin sender
ALTER TABLE chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey
        FOREIGN KEY (sender_id)
        REFERENCES profiles(id)
        ON DELETE SET NULL;

-- 3. Mismo ajuste para chat_reactions (user_id también necesita join a profiles)
ALTER TABLE chat_reactions
    DROP CONSTRAINT IF EXISTS chat_reactions_user_id_fkey;

ALTER TABLE chat_reactions
    ADD CONSTRAINT chat_reactions_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE;

-- 4. chat_channel_members.user_id → profiles (para joins futuros de miembros)
ALTER TABLE chat_channel_members
    DROP CONSTRAINT IF EXISTS chat_channel_members_user_id_fkey;

ALTER TABLE chat_channel_members
    ADD CONSTRAINT chat_channel_members_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE;

-- 5. chat_channels.created_by → profiles (consistencia)
ALTER TABLE chat_channels
    DROP CONSTRAINT IF EXISTS chat_channels_created_by_fkey;

ALTER TABLE chat_channels
    ADD CONSTRAINT chat_channels_created_by_fkey
        FOREIGN KEY (created_by)
        REFERENCES profiles(id)
        ON DELETE SET NULL;

COMMENT ON CONSTRAINT chat_messages_sender_id_fkey ON chat_messages
    IS 'FK a public.profiles (no auth.users) para que PostgREST resuelva profiles!sender_id';
