"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { chatService } from "../services/chatService";
import { ChatChannel, ChatMessage } from "../types";
import {
    Send,
    Paperclip,
    Hash,
    Search,
    MessageSquare,
    Circle,
    User,
    FileIcon,
    Loader2,
    Smile,
    ArrowUpRight,
    ShieldCheck,
    Zap,
    MoreVertical
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
import { Badge } from "@/shared/components/ui/badge";
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
    const [currentUser, setCurrentUser] = useState<{ id: string; user_metadata?: { full_name?: string } } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    useEffect(() => {
        loadChannels();
        supabase.auth.getUser().then(({ data: { user } }: { data: { user: unknown } }) => setCurrentUser(user as typeof currentUser));
    }, []);

    useEffect(() => {
        if (activeChannel && currentUser) {
            loadMessages(activeChannel.id);

            const msgChannel = supabase.channel(`channel:${activeChannel.id}`)
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${activeChannel.id}` },
                    (payload: { new: ChatMessage }) => setMessages(prev => [...prev, payload.new as ChatMessage])
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'chat_reactions' },
                    () => loadMessages(activeChannel.id)
                )
                .subscribe();

            const presenceChannel = supabase.channel(`presence:${activeChannel.id}`)
                .on('presence', { event: 'sync' }, () => {
                    const state = presenceChannel.presenceState();
                    const typing: Record<string, string> = {};
                    Object.keys(state).forEach(key => {
                        const usr: { is_typing?: boolean; id?: string; name?: string } = (state[key] as Array<{ is_typing?: boolean; id?: string; name?: string }>)[0];
                        if (usr.is_typing && usr.id !== currentUser.id) {
                            typing[usr.id || ''] = usr.name || 'Alguien';
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
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error("Error loading channels:", msg);
        } finally {
            setLoading(false);
        }
    }

    async function loadMessages(channelId: string) {
        try {
            const data = await chatService.getMessages(supabase, channelId);
            setMessages(data);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error("Error loading messages:", msg);
        }
    }

    async function handleSend() {
        if (!newMessage.trim() || !activeChannel) return;
        const text = newMessage;
        setNewMessage("");
        try {
            await chatService.sendMessage(supabase, activeChannel.id, text);
            if (presenceChannelRef.current) {
                presenceChannelRef.current.track({
                    id: currentUser?.id,
                    name: currentUser?.user_metadata?.full_name,
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
            await supabase.from('chat_channels').update({ updated_at: new Date().toISOString() }).eq('id', activeChannel.id);
        } catch (error: unknown) {
            console.error(error);
            alert("Error al subir archivo.");
        } finally {
            setUploading(false);
        }
    }

    // ─────────────────────── RENDER ───────────────────────
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] gap-6">
                <div className="h-20 w-20 rounded-[2rem] bg-slate-950 flex items-center justify-center shadow-active">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 italic">Sincronizando canales...</p>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-14rem)] rounded-[3.5rem] overflow-hidden shadow-active border border-slate-800 bg-slate-950">

            {/* ═══════════ SIDEBAR INDUSTRIAL ═══════════ */}
            <div className="w-80 border-r border-white/5 flex flex-col bg-slate-950">
                {/* Search */}
                <div className="p-6 border-b border-white/5">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                        <Input
                            placeholder="Buscar canales..."
                            className="pl-11 h-12 bg-white/5 border-white/5 rounded-2xl text-xs font-bold text-white placeholder:text-slate-600 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/30"
                        />
                    </div>
                </div>

                {/* Channels */}
                <ScrollArea className="flex-1 px-3 py-4">
                    <div className="space-y-1">
                        <p className="px-4 text-[9px] font-black uppercase tracking-[0.4em] text-slate-600 mb-3 italic">Nodos Activos</p>
                        {channels.map((channel) => (
                            <button
                                key={channel.id}
                                onClick={() => setActiveChannel(channel)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-500 group",
                                    activeChannel?.id === channel.id
                                        ? "bg-indigo-500/10 border border-indigo-500/20"
                                        : "hover:bg-white/5 border border-transparent"
                                )}
                            >
                                <div className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-500 shrink-0",
                                    activeChannel?.id === channel.id
                                        ? "bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] rotate-6"
                                        : "bg-white/5 text-slate-600 group-hover:bg-white/10 group-hover:text-slate-400"
                                )}>
                                    <Hash className="h-5 w-5" />
                                </div>
                                <div className="flex-1 text-left overflow-hidden">
                                    <p className={cn(
                                        "font-black text-sm truncate italic tracking-tight transition-colors",
                                        activeChannel?.id === channel.id ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                                    )}>{channel.name || "Canal"}</p>
                                    <p className="text-[9px] text-slate-600 font-bold truncate uppercase tracking-widest">
                                        {channel.type === 'public' ? 'PÚBLICO' : channel.type === 'private' ? 'PRIVADO' : 'DIRECTO'}
                                    </p>
                                </div>
                                {activeChannel?.id === channel.id && (
                                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                                )}
                            </button>
                        ))}
                    </div>
                </ScrollArea>

                {/* Bottom Badge */}
                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-2xl">
                        <ShieldCheck className="h-4 w-4 text-indigo-400" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Enlace E2E Cifrado</span>
                    </div>
                </div>
            </div>

            {/* ═══════════ CHAT AREA ═══════════ */}
            <div className="flex-1 flex flex-col bg-slate-900/50">
                {activeChannel ? (
                    <>
                        {/* Header */}
                        <div className="h-20 px-8 border-b border-white/5 flex items-center justify-between bg-slate-950/50 backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                                    <Hash className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-black text-white italic tracking-tight text-lg leading-none">
                                        {activeChannel.name}
                                    </h3>
                                    <p className="text-[9px] font-black text-emerald-400 flex items-center gap-1.5 mt-1 uppercase tracking-[0.3em]">
                                        <Circle className="h-1.5 w-1.5 fill-current animate-pulse" />
                                        Transmisión Activa
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge className="bg-white/5 border border-white/10 text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] px-4 py-2 rounded-full">
                                    <Zap className="h-3 w-3 mr-2 text-indigo-400" />
                                    Realtime
                                </Badge>
                                <Button variant="ghost" size="icon" className="rounded-xl text-slate-600 hover:text-white hover:bg-white/5">
                                    <MoreVertical className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Messages */}
                        <ScrollArea className="flex-1 p-8" ref={scrollRef}>
                            <div className="space-y-6 pb-4">
                                {messages.map((message) => {
                                    const isMe = message.sender_id === currentUser?.id;
                                    return (
                                        <div key={message.id} className={cn("flex gap-4 group", isMe && "flex-row-reverse")}>
                                            <Avatar className="h-10 w-10 rounded-xl border border-white/10 shrink-0 shadow-sm">
                                                <AvatarImage src={message.sender?.avatar_url} />
                                                <AvatarFallback className="bg-white/10 text-slate-400 text-xs font-black rounded-xl">
                                                    {message.sender?.full_name?.substring(0, 2).toUpperCase() || <User className="h-4 w-4" />}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className={cn("flex-1 space-y-1.5 max-w-[70%]", isMe && "items-end")}>
                                                <div className={cn("flex items-center gap-2", isMe && "flex-row-reverse")}>
                                                    <span className="font-black text-white/80 text-xs italic">
                                                        {isMe ? "Tú" : (message.sender?.full_name || "Usuario")}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">
                                                        {format(new Date(message.created_at), "HH:mm")}
                                                    </span>
                                                </div>
                                                <div className={cn(
                                                    "p-4 rounded-2xl text-sm font-medium leading-relaxed inline-block relative group/msg transition-all duration-500",
                                                    isMe
                                                        ? "bg-indigo-500 text-white rounded-tr-sm shadow-[0_4px_20px_rgba(99,102,241,0.2)]"
                                                        : "bg-white/5 text-slate-300 rounded-tl-sm border border-white/5 hover:bg-white/10"
                                                )}>
                                                    {message.message_type === 'file' ? (
                                                        <a
                                                            href={message.file_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={cn(
                                                                "flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.02]",
                                                                isMe ? "bg-white/10 border-white/20" : "bg-white/5 border-white/10 hover:border-indigo-500/30"
                                                            )}
                                                        >
                                                            <div className="h-10 w-10 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 shrink-0">
                                                                <FileIcon className="h-5 w-5" />
                                                            </div>
                                                            <div className="flex-1 overflow-hidden">
                                                                <p className={cn("font-bold truncate text-xs", isMe ? "text-white" : "text-slate-200")}>{message.file_name}</p>
                                                                <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-1">
                                                                    <ArrowUpRight className="h-3 w-3" /> Abrir archivo
                                                                </p>
                                                            </div>
                                                        </a>
                                                    ) : (
                                                        message.content
                                                    )}

                                                    {/* Reaction Trigger */}
                                                    <div className={cn(
                                                        "absolute top-0 opacity-0 group-hover/msg:opacity-100 transition-all duration-300",
                                                        isMe ? "-left-10" : "-right-10"
                                                    )}>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-950 border border-white/10 shadow-lg hover:bg-white/10 text-slate-400 hover:text-white">
                                                                    <Smile className="h-4 w-4" />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent side={isMe ? "left" : "right"} className="w-auto p-1.5 rounded-2xl bg-slate-950 border-white/10">
                                                                <div className="flex gap-0.5">
                                                                    {['👍', '❤️', '🔥', '😂', '😮', '🚀'].map(emoji => (
                                                                        <button
                                                                            key={emoji}
                                                                            onClick={() => handleReaction(message.id, emoji)}
                                                                            className="p-2 hover:bg-white/10 rounded-xl transition-all text-lg hover:scale-125 active:scale-90"
                                                                        >
                                                                            {emoji}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>

                                                    {/* Reactions Display */}
                                                    {message.reactions && message.reactions.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {Object.entries(
                                                                message.reactions.reduce((acc: Record<string, number>, curr) => {
                                                                    acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
                                                                    return acc;
                                                                }, {})
                                                            ).map(([emoji, count]) => (
                                                                <button
                                                                    key={emoji}
                                                                    onClick={() => handleReaction(message.id, emoji)}
                                                                    className={cn(
                                                                        "flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-bold transition-all hover:scale-110 active:scale-90",
                                                                        message.reactions?.some(r => r.user_id === currentUser?.id && r.emoji === emoji)
                                                                            ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
                                                                            : "bg-white/5 border-white/10 text-slate-500 hover:border-white/20"
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
                                    );
                                })}
                            </div>
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="p-6 border-t border-white/5 bg-slate-950/80 backdrop-blur-md">
                            <input
                                type="file"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                            />
                            <div className="bg-white/5 rounded-[2rem] border border-white/10 p-2 flex items-center gap-2 group focus-within:border-indigo-500/30 focus-within:shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-all duration-500">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-xl h-12 w-12 text-slate-600 hover:text-white hover:bg-white/10 shrink-0"
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
                                    className="border-none focus-visible:ring-0 shadow-none font-bold text-sm placeholder:text-slate-600 text-white bg-transparent"
                                    placeholder="Escribe un mensaje seguro..."
                                    value={newMessage}
                                    onChange={(e) => {
                                        setNewMessage(e.target.value);
                                        handleTyping();
                                    }}
                                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                />
                                <Button
                                    onClick={handleSend}
                                    disabled={!newMessage.trim()}
                                    className={cn(
                                        "h-12 w-12 rounded-xl shrink-0 transition-all duration-500 active:scale-90",
                                        newMessage.trim()
                                            ? "bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                                            : "bg-white/5 text-slate-600"
                                    )}
                                >
                                    <Send className="h-5 w-5" />
                                </Button>
                            </div>

                            {/* Typing Indicator */}
                            {Object.keys(typingUsers).length > 0 && (
                                <div className="mt-3 px-4 flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce" />
                                    </div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] italic">
                                        {Object.values(typingUsers).join(", ")} {Object.keys(typingUsers).length > 1 ? "están escribiendo..." : "está escribiendo..."}
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                        <div className="h-24 w-24 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center">
                            <MessageSquare className="h-12 w-12 text-slate-700" />
                        </div>
                        <div className="text-center space-y-2">
                            <p className="font-black italic text-xl text-white/20 uppercase tracking-tight">Terminal de Comunicación</p>
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Selecciona un canal para iniciar transmisión</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
