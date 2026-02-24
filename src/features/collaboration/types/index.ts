export type ChannelType = 'public' | 'private' | 'direct';
export type MessageType = 'text' | 'file' | 'system';

export interface ChatChannel {
    id: string;
    name: string | null;
    description: string | null;
    type: ChannelType;
    tenant_id: string;
    created_at: string;
    updated_at: string;
    last_message?: ChatMessage;
    unread_count?: number;
}

export interface ChatMessage {
    id: string;
    channel_id: string;
    sender_id: string;
    content: string | null;
    message_type: MessageType;
    file_url?: string;
    file_name?: string;
    file_type?: string;
    created_at: string;
    sender?: {
        full_name?: string;
        avatar_url?: string;
        email?: string;
    };
    reactions?: MessageReaction[];
}

export interface MessageReaction {
    id: string;
    message_id: string;
    user_id: string;
    emoji: string;
    created_at: string;
}

export interface ChatMember {
    channel_id: string;
    user_id: string;
    role: string;
    last_read_at: string;
    profile?: {
        full_name?: string;
        avatar_url?: string;
        email?: string;
    };
}
