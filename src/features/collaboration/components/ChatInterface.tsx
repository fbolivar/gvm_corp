"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { chatService } from "../services/chatService";
import { ChatChannel, ChatMessage } from "../types";
import {
    Send,
    Paperclip,
    MoreVertical,
    Hash,
    Search,
    MessageSquare,
    Users,
    Circle,
    User,
    FileIcon,
    Loader2,
    Smile,
    Trash2
} from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { cn } from "@/shared/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function ChatInterface() {
    const supabase = createClient();
    const [channels, setChannels] = useState<ChatChannel[]>([]);
    const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
    const [currentUser, setCurrentUser] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<any>(null);
    const presenceChannelRef = useRef<any>(null);

    useEffect(() => {
        loadChannels();
        supabase.auth.getUser().then(({ data: { user } }: { data: { user: unknown } }) => setCurrentUser(user));
    }, []);

    useEffect(() => {
        if (activeChannel && currentUser) {
            loadMessages(activeChannel.id);

            // Subscribe to Messages and Reactions
            const msgChannel = supabase.channel(`channel:${activeChannel.id}`)
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${activeChannel.id}` },
                    (payload: { new: ChatMessage }) => setMessages(prev => [...prev, payload.new as ChatMessage])
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'chat_reactions' },
                    () => loadMessages(activeChannel.id) // Reload to simplify reaction update
                )
                .subscribe();

            // Presence for Typing Indicators
            const presenceChannel = supabase.channel(`presence:${activeChannel.id}`)
                .on('presence', { event: 'sync' }, () => {
                    const state = presenceChannel.presenceState();
                    const typing: Record<string, string> = {};
                    Object.keys(state).forEach(key => {
                        const user: any = state[key][0];
                        if (user.is_typing && user.id !== currentUser.id) {
                            typing[user.id] = user.name || 'Alguien';
                        }
                    });
                    setTypingUsers(typing);
                })
                .subscribe(async (status: string) => {
                    if (status === 'SUBSCRIBED') {
                        presenceChannelRef.current = presenceChannel;
                        await presenceChannel.track({
                            id: currentUser.id,
                            name: currentUser.user_metadata?.full_name,
                            is_typing: false
                        });
                    }
                });

            return () => {
                supabase.removeChannel(msgChannel);
                supabase.removeChannel(presenceChannel);
                presenceChannelRef.current = null;
            };
        }
    }, [activeChannel, currentUser]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    async function loadChannels() {
        try {
            const data = await chatService.getChannels(supabase);
            setChannels(data);
            if (data && data.length > 0 && !activeChannel) {
                setActiveChannel(data[0]);
            }
        } catch (error: any) {
            console.error("Error loading channels:", error.message || error);
        } finally {
            setLoading(false);
        }
    }

    async function loadMessages(channelId: string) {
        try {
            const data = await chatService.getMessages(supabase, channelId);
            setMessages(data);
        } catch (error: any) {
            console.error("Error loading messages:", error.message || error);
        }
    }

    async function handleSend() {
        if (!newMessage.trim() || !activeChannel) return;
        const text = newMessage;
        setNewMessage("");
        try {
            await chatService.sendMessage(supabase, activeChannel.id, text);
            // Stop typing indicator
            if (presenceChannelRef.current) {
                presenceChannelRef.current.track({
                    id: currentUser.id,
                    name: currentUser.user_metadata?.full_name,
                    is_typing: false
                });
            }
        } catch (error) {
            console.error(error);
        }
    }

    const handleTyping = () => {
        if (!activeChannel || !currentUser || !presenceChannelRef.current) return;

        presenceChannelRef.current.track({
            id: currentUser.id,
            name: currentUser.user_metadata?.full_name,
            is_typing: true
        });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            if (presenceChannelRef.current) {
                presenceChannelRef.current.track({
                    id: currentUser.id,
                    name: currentUser.user_metadata?.full_name,
                    is_typing: false
                });
            }
        }, 2000);
    };

    async function handleReaction(messageId: string, emoji: string) {
        try {
            await chatService.toggleReaction(supabase, messageId, emoji);
        } catch (error) {
            console.error(error);
        }
    }

    async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !activeChannel) return;

        setUploading(true);
        try {
            const { url, name, type } = await chatService.uploadFile(supabase, file);
            await supabase.from('chat_messages').insert({
                channel_id: activeChannel.id,
                sender_id: (await supabase.auth.getUser()).data.user?.id,
                content: `Envió un archivo: ${name}`,
                message_type: 'file',
                file_url: url,
                file_name: name,
                file_type: type
            });
            // Update channel timestamp
            await supabase.from('chat_channels').update({ updated_at: new Date().toISOString() }).eq('id', activeChannel.id);
        } catch (error: any) {
            console.error(error);
            alert("Error al subir archivo. Verifique que el bucket 'chat-files' sea público.");
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="flex h-[calc(100vh-10rem)] bg-white rounded-[2.5rem] shadow-premium overflow-hidden border border-slate-100">
            {/* Sidebar */}
            <div className="w-80 border-r border-slate-50 flex flex-col bg-slate-50/30">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black italic tracking-tighter text-slate-900">Mensajes</h2>
                        <Button variant="ghost" size="icon" className="rounded-xl">
                            <MessageSquare className="h-5 w-5 text-slate-400" />
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                        <Input
                            placeholder="Buscar chats..."
                            className="pl-10 h-11 bg-white border-none rounded-xl text-xs font-bold shadow-sm"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1 px-4">
                    <div className="space-y-1 pb-6">
                        <p className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-2">Canales</p>
                        {channels.map((channel) => (
                            <button
                                key={channel.id}
                                onClick={() => setActiveChannel(channel)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-300 group",
                                    activeChannel?.id === channel.id
                                        ? "bg-white shadow-premium-sm text-primary"
                                        : "text-slate-500 hover:bg-white/50"
                                )}
                            >
                                <div className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
                                    activeChannel?.id === channel.id ? "bg-primary/10" : "bg-slate-100 group-hover:bg-white"
                                )}>
                                    <Hash className="h-5 w-5" />
                                </div>
                                <div className="flex-1 text-left overflow-hidden">
                                    <p className="font-bold text-sm truncate">{channel.name || "Canal"}</p>
                                    <p className="text-[10px] text-slate-400 font-medium truncate">Último mensaje...</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-white">
                {activeChannel ? (
                    <>
                        {/* Header */}
                        <div className="h-20 px-8 border-b border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-11 w-11 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                                    <Hash className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 italic tracking-tight leading-none">
                                        {activeChannel.name}
                                    </h3>
                                    <p className="text-[10px] font-bold text-emerald-500 flex items-center gap-1.5 mt-1 uppercase tracking-widest">
                                        <Circle className="h-2 w-2 fill-current" />
                                        Activo ahora
                                    </p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="rounded-xl text-slate-300">
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Messages Area */}
                        <ScrollArea className="flex-1 p-8" ref={scrollRef}>
                            <div className="space-y-8 pb-4">
                                {messages.map((message) => (
                                    <div key={message.id} className="flex gap-4 group">
                                        <Avatar className="h-10 w-10 rounded-xl border border-slate-100">
                                            <AvatarImage src={message.sender?.avatar_url} />
                                            <AvatarFallback className="bg-slate-100 text-slate-400 text-xs font-black">
                                                {message.sender?.full_name?.substring(0, 2).toUpperCase() || <User className="h-4 w-4" />}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-slate-900 text-xs italic">
                                                    {message.sender?.full_name || "Usuario"}
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">
                                                    {format(new Date(message.created_at), "HH:mm")}
                                                </span>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-2xl rounded-tl-none text-sm text-slate-600 font-medium leading-relaxed max-w-2xl inline-block relative group/msg">
                                                {message.message_type === 'file' ? (
                                                    <a
                                                        href={message.file_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 hover:border-primary/30 transition-colors"
                                                    >
                                                        <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-primary">
                                                            <FileIcon className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex-1 overflow-hidden">
                                                            <p className="font-bold text-slate-900 truncate">{message.file_name}</p>
                                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Descargar Archivo</p>
                                                        </div>
                                                    </a>
                                                ) : (
                                                    message.content
                                                )}

                                                {/* Reaction Selector (Mini) */}
                                                <div className="absolute -right-12 top-0 opacity-0 group-hover/msg:opacity-100 transition-opacity flex flex-col gap-1">
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-white border border-slate-100 shadow-sm hover:text-primary">
                                                                <Smile className="h-4 w-4" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent side="right" className="w-auto p-1 rounded-xl">
                                                            <div className="flex gap-1">
                                                                {['👍', '❤️', '🔥', '😂', '😮', '🚀'].map(emoji => (
                                                                    <button
                                                                        key={emoji}
                                                                        onClick={() => handleReaction(message.id, emoji)}
                                                                        className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-lg"
                                                                    >
                                                                        {emoji}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>

                                                {/* Display Reactions */}
                                                {message.reactions && message.reactions.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {Object.entries(
                                                            message.reactions.reduce((acc: any, curr) => {
                                                                acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
                                                                return acc;
                                                            }, {})
                                                        ).map(([emoji, count]: [string, any]) => (
                                                            <button
                                                                key={emoji}
                                                                onClick={() => handleReaction(message.id, emoji)}
                                                                className={cn(
                                                                    "flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-bold transition-all",
                                                                    message.reactions?.some(r => r.user_id === currentUser?.id && r.emoji === emoji)
                                                                        ? "bg-primary/5 border-primary/20 text-primary"
                                                                        : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                                                )}
                                                            >
                                                                <span>{emoji}</span>
                                                                <span>{count}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="p-6 bg-slate-50/30">
                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                            />
                            <div className="bg-white rounded-[1.5rem] border border-slate-100 p-2 flex items-center gap-2 shadow-premium-sm">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-xl h-10 w-10 text-slate-300"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                >
                                    {uploading ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <Paperclip className="h-5 w-5" />
                                    )}
                                </Button>
                                <Input
                                    className="border-none focus-visible:ring-0 shadow-none font-medium text-sm placeholder:text-slate-300"
                                    placeholder="Escribe un mensaje aquí..."
                                    value={newMessage}
                                    onChange={(e) => {
                                        setNewMessage(e.target.value);
                                        handleTyping();
                                    }}
                                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                />
                                <Button
                                    onClick={handleSend}
                                    className="bg-slate-900 hover:bg-primary text-white h-10 w-10 rounded-xl shadow-lg shadow-slate-200 transition-all active:scale-95"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Typing Indicator Overlay */}
                            {Object.keys(typingUsers).length > 0 && (
                                <div className="mt-3 px-2 flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {Object.values(typingUsers).join(", ")} {Object.keys(typingUsers).length > 1 ? "están escribiendo..." : "está escribiendo..."}
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 space-y-4">
                        <div className="h-20 w-20 rounded-3xl bg-slate-50 flex items-center justify-center">
                            <MessageSquare className="h-10 w-10" />
                        </div>
                        <p className="font-black italic text-lg uppercase tracking-tight">Selecciona un chat para comenzar</p>
                    </div>
                )}
            </div>
        </div>
    );
}
