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
        const fileName = `${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
            .from('chat-files')
            .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('chat-files')
            .getPublicUrl(data.path);

        return {
            url: publicUrl,
            name: file.name,
            type: file.type
        };
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
    }
};
