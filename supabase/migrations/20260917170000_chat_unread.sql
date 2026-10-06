-- Chat: mensajes no leídos por canal para el usuario autenticado.
--
-- Alimenta el ícono flotante de chat (badge en tiempo real) y el contador en la
-- pestaña. Se cuenta contra chat_channel_members.last_read_at, que la página de
-- Colaboración actualiza al abrir un canal (mark_chat_channel_read).
--
-- SECURITY INVOKER: respeta la RLS de chat_messages / chat_channel_members.

CREATE OR REPLACE FUNCTION public.get_chat_unread()
RETURNS TABLE (channel_id uuid, channel_name text, channel_type text, unread bigint, last_sender_id uuid, last_at timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT m.channel_id, c.name, c.type,
         count(x.id) AS unread,
         (array_agg(x.sender_id ORDER BY x.created_at DESC))[1] AS last_sender_id,
         max(x.created_at) AS last_at
  FROM chat_channel_members m
  JOIN chat_channels c ON c.id = m.channel_id
  JOIN chat_messages x ON x.channel_id = m.channel_id
       AND x.sender_id <> auth.uid()
       AND x.created_at > COALESCE(m.last_read_at, m.joined_at, '1970-01-01'::timestamptz)
  WHERE m.user_id = auth.uid()
  GROUP BY m.channel_id, c.name, c.type
  HAVING count(x.id) > 0;
$$;

CREATE OR REPLACE FUNCTION public.mark_chat_channel_read(p_channel_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE chat_channel_members SET last_read_at = now()
  WHERE channel_id = p_channel_id AND user_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_chat_unread() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_chat_channel_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_chat_unread() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_chat_channel_read(uuid) TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created ON public.chat_messages(channel_id, created_at DESC);
