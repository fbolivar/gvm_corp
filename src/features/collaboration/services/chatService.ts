import { SupabaseClient } from '@supabase/supabase-js';
import { ChatChannel, ChatMessage, ChatMember } from '../types';

export const chatService = {
    async getChannels(supabase: SupabaseClient) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // Fetch channels where user is a member OR public channels
        const { data, error } = await supabase
            .from('chat_channels')
            .select(`
                *,
                chat_channel_members(user_id)
            `)
            .order('updated_at', { ascending: false });

        if (error) {
            // Table may not exist yet — return empty instead of crashing
            console.warn('chatService.getChannels:', error.message);
            return [];
        }

        // Filter in JS for now if complex OR query with joins is tricky in PostgREST
        return (data as any[]).filter(channel =>
            channel.type === 'public' ||
            channel.chat_channel_members?.some((m: { user_id: string }) => m.user_id === user.id)
        ) as ChatChannel[];
    },

    /**
     * Abre (o crea si no existe) un canal de mensaje directo 1:1 entre el usuario
     * actual y otro usuario del mismo tenant. Se representa como type='direct' y
     * se nombra con ambos nombres para que ambos participantes vean lo mismo.
     */
    async openDirectChannel(
        supabase: SupabaseClient,
        params: { me: string; meName: string; other: string; otherName: string; tenantId: string }
    ): Promise<ChatChannel> {
        const { me, meName, other, otherName, tenantId } = params;

        // Buscar un directo existente entre los dos (miembros == {me, other})
        const { data: candidates } = await supabase
            .from('chat_channels')
            .select('id, type, chat_channel_members(user_id)')
            .eq('type', 'direct')
            .eq('tenant_id', tenantId);

        const existing = (candidates as { id: string; chat_channel_members?: { user_id: string }[] }[] | null || [])
            .find(c => {
                const ids = (c.chat_channel_members ?? []).map(m => m.user_id);
                return ids.length === 2 && ids.includes(me) && ids.includes(other);
            });

        if (existing) {
            const { data } = await supabase.from('chat_channels').select('*').eq('id', existing.id).single();
            return data as ChatChannel;
        }

        const name = [meName, otherName].sort((a, b) => a.localeCompare(b, 'es')).join(' · ');
        const { data: ch, error } = await supabase
            .from('chat_channels')
            .insert({ name, description: null, type: 'direct', tenant_id: tenantId, created_by: me })
            .select()
            .single();
        if (error) throw error;

        await supabase.from('chat_channel_members').insert([
            { channel_id: ch.id, user_id: me },
            { channel_id: ch.id, user_id: other },
        ]);

        return ch as ChatChannel;
    },

    async getMessages(supabase: SupabaseClient, channelId: string, limit = 50) {
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*, chat_reactions(*), sender:profiles!sender_id(full_name, avatar_url)')
            .eq('channel_id', channelId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        // Transform data to match local structure
        const messages = data.map((msg: any) => ({
            ...msg,
            reactions: msg.chat_reactions || [],
            sender: msg.sender
        }));

        return messages.reverse() as ChatMessage[];
    },

    async toggleReaction(supabase: SupabaseClient, messageId: string, emoji: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No auth user');

        const { data: existing } = await supabase
            .from('chat_reactions')
            .select('*')
            .eq('message_id', messageId)
            .eq('user_id', user.id)
            .eq('emoji', emoji)
            .maybeSingle();

        if (existing) {
            const { error } = await supabase
                .from('chat_reactions')
                .delete()
                .eq('id', existing.id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('chat_reactions')
                .insert({
                    message_id: messageId,
                    user_id: user.id,
                    emoji
                });
            if (error) throw error;
        }
    },

    async sendMessage(supabase: SupabaseClient, channelId: string, content: string, type: 'text' | 'file' = 'text') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No auth user');

        const { data, error } = await supabase
            .from('chat_messages')
            .insert({
                channel_id: channelId,
                sender_id: user.id,
                content,
                message_type: type
            })
            .select()
            .single();

        if (error) throw error;

        // Update channel updated_at
        await supabase
            .from('chat_channels')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', channelId);

        return data as ChatMessage;
    },

    async uploadFile(supabase: SupabaseClient, file: File) {
        // Bucket privado: nombre NO adivinable (UUID) y URL FIRMADA temporal.
        // Nunca URL pública — evita exponer adjuntos del chat a cualquiera con el enlace.
        const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
        const path = `${crypto.randomUUID()}${ext ? '.' + ext : ''}`;

        const { data, error } = await supabase.storage
            .from('chat-files')
            .upload(path, file, { contentType: file.type });

        if (error) throw error;

        // Enlace firmado con expiración (7 días). Al leer un mensaje se debe
        // regenerar con getSignedUrl(storage_path) usando el path guardado.
        const { data: signed } = await supabase.storage
            .from('chat-files')
            .createSignedUrl(data.path, 60 * 60 * 24 * 7);

        return {
            url: signed?.signedUrl ?? '',
            path: data.path,
            name: file.name,
            type: file.type
        };
    },

    /** Regenera un enlace firmado para un adjunto del chat a partir de su path. */
    async getSignedUrl(supabase: SupabaseClient, storagePath: string): Promise<string | null> {
        const { data } = await supabase.storage
            .from('chat-files')
            .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
        return data?.signedUrl ?? null;
    },

    subscribeToMessages(supabase: SupabaseClient, channelId: string, onMessage: (message: ChatMessage) => void) {
        return supabase
            .channel(`channel:${channelId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `channel_id=eq.${channelId}`
                },
                (payload) => {
                    onMessage(payload.new as ChatMessage);
                }
            )
            .subscribe();
    },

    async getChannelMembers(supabase: SupabaseClient, channelId: string): Promise<ChatMember[]> {
        const { data, error } = await supabase
            .from('chat_channel_members')
            .select('*, profile:profiles!user_id(full_name, avatar_url, email)')
            .eq('channel_id', channelId);

        if (error) {
            console.warn('chatService.getChannelMembers:', error.message);
            return [];
        }

        return (data ?? []).map((m: Record<string, unknown>) => ({
            channel_id: m.channel_id as string,
            user_id: m.user_id as string,
            role: m.role as string,
            last_read_at: m.last_read_at as string,
            profile: m.profile as ChatMember['profile'],
        }));
    }
};
