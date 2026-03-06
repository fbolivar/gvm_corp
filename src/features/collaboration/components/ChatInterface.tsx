"use client";

import {
    useEffect,
    useState,
    useRef,
    useCallback,
    type KeyboardEvent,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { chatService } from "../services/chatService";
import { ChatChannel, ChatMessage, ChatMember } from "../types";
import { useOnlinePresence } from "../hooks/useOnlinePresence";
import {
    Send,
    Hash,
    Search,
    MessageSquare,
    Circle,
    Loader2,
    Smile,
    Zap,
    Plus,
    ArrowLeft,
    Lock,
    Globe,
    X,
    CheckCheck,
    ShieldCheck,
    Users,
    ChevronRight,
} from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    userId: string;
    userFullName: string;
    tenantId: string;
}

interface SenderCache {
    [userId: string]: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMessageTime(iso: string): string {
    const date = new Date(iso);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return `Ayer ${format(date, "HH:mm")}`;
    return format(date, "d MMM HH:mm", { locale: es });
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

const QUICK_REACTIONS = ["👍", "❤️", "🔥", "😂", "😮", "🚀"];

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatInterface({ userId, userFullName, tenantId }: Props) {
    const supabase = createClient();

    // State
    const [channels, setChannels] = useState<ChatChannel[]>([]);
    const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loadingChannels, setLoadingChannels] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [senderCache, setSenderCache] = useState<SenderCache>({});
    const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newChannelName, setNewChannelName] = useState("");
    const [newChannelDesc, setNewChannelDesc] = useState("");
    const [newChannelPrivate, setNewChannelPrivate] = useState(false);
    const [creatingChannel, setCreatingChannel] = useState(false);
    // Mobile: show sidebar (true) or messages (false)
    const [showSidebar, setShowSidebar] = useState(true);
    // Online presence (shared hook)
    const onlineUsers = useOnlinePresence(tenantId, userId, userFullName);
    // Channel members
    const [channelMembers, setChannelMembers] = useState<ChatMember[]>([]);
    const [showMembers, setShowMembers] = useState(false);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const lastOptimisticIdRef = useRef<string | null>(null);

    // ── Load sender name (with local cache) ──────────────────────────────────

    const resolveSenderName = useCallback(
        async (senderId: string): Promise<string> => {
            if (senderId === userId) return "Tú";
            if (senderCache[senderId]) return senderCache[senderId];

            const { data } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", senderId)
                .maybeSingle();

            const name = data?.full_name ?? "Usuario";
            setSenderCache((prev) => ({ ...prev, [senderId]: name }));
            return name;
        },
        [userId, senderCache, supabase]
    );

    // ── Load channels ─────────────────────────────────────────────────────────

    const loadChannels = useCallback(async () => {
        setLoadingChannels(true);
        try {
            const data = await chatService.getChannels(supabase);
            setChannels(data);

            if (data.length > 0 && !activeChannel) {
                setActiveChannel(data[0]);
                setShowSidebar(false);
            }
        } catch (err) {
            console.error("loadChannels:", err);
        } finally {
            setLoadingChannels(false);
        }
    }, [supabase, activeChannel]);

    // ── Load messages for a channel ───────────────────────────────────────────

    const loadMessages = useCallback(
        async (channelId: string) => {
            setLoadingMessages(true);
            try {
                const data = await chatService.getMessages(supabase, channelId);

                // Pre-warm sender cache
                const unknownIds = data
                    .filter((m) => m.sender_id !== userId && !m.sender?.full_name)
                    .map((m) => m.sender_id)
                    .filter((id, idx, arr) => arr.indexOf(id) === idx);

                if (unknownIds.length > 0) {
                    const { data: profiles } = await supabase
                        .from("profiles")
                        .select("id, full_name")
                        .in("id", unknownIds);

                    if (profiles) {
                        const additions: SenderCache = {};
                        for (const p of profiles as { id: string; full_name: string }[]) {
                            additions[p.id] = p.full_name;
                        }
                        setSenderCache((prev) => ({ ...prev, ...additions }));
                    }
                }

                setMessages(data);
            } catch (err) {
                console.error("loadMessages:", err);
            } finally {
                setLoadingMessages(false);
            }
        },
        [supabase, userId]
    );

    // ── Load channel members ──────────────────────────────────────────────────

    const loadChannelMembers = useCallback(
        async (channelId: string) => {
            const members = await chatService.getChannelMembers(supabase, channelId);
            setChannelMembers(members);
        },
        [supabase]
    );

    // ── Ensure user is a member of a channel ─────────────────────────────────

    const ensureMember = useCallback(
        async (channelId: string) => {
            const { data: existing } = await supabase
                .from("chat_channel_members")
                .select("id")
                .eq("channel_id", channelId)
                .eq("user_id", userId)
                .maybeSingle();

            if (!existing) {
                await supabase
                    .from("chat_channel_members")
                    .insert({ channel_id: channelId, user_id: userId });
            }
        },
        [supabase, userId]
    );

    // ── Realtime subscription ─────────────────────────────────────────────────

    useEffect(() => {
        if (!activeChannel) return;

        loadMessages(activeChannel.id);
        loadChannelMembers(activeChannel.id);

        // Messages channel
        const msgChannel = supabase
            .channel(`messages:${activeChannel.id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "chat_messages",
                    filter: `channel_id=eq.${activeChannel.id}`,
                },
                async (payload: { new: unknown }) => {
                    const incoming = payload.new as ChatMessage;

                    // Resolve sender name for the incoming message
                    if (incoming.sender_id !== userId) {
                        const name = await resolveSenderName(incoming.sender_id);
                        incoming.sender = { full_name: name };
                    } else {
                        incoming.sender = { full_name: "Tú" };
                    }

                    setMessages((prev) => {
                        // If we have an optimistic message from this sender, replace it
                        const optId = lastOptimisticIdRef.current;
                        if (optId && incoming.sender_id === userId) {
                            lastOptimisticIdRef.current = null;
                            return prev.map((m) => (m.id === optId ? incoming : m));
                        }
                        // Deduplicate
                        if (prev.some((m) => m.id === incoming.id)) return prev;
                        return [...prev, incoming];
                    });
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "DELETE",
                    schema: "public",
                    table: "chat_messages",
                    filter: `channel_id=eq.${activeChannel.id}`,
                },
                (payload: { old: unknown }) => {
                    setMessages((prev) =>
                        prev.filter((m) => m.id !== (payload.old as { id: string }).id)
                    );
                }
            )
            .subscribe();

        realtimeChannelRef.current = msgChannel;

        // Presence channel for typing indicators
        const presenceKey = `presence:collab:${activeChannel.id}`;
        const presenceCh = supabase
            .channel(presenceKey)
            .on("presence", { event: "sync" }, () => {
                const state = presenceCh.presenceState();
                const typing: Record<string, string> = {};
                Object.values(state).forEach((presences) => {
                    const p = (presences as Array<{ id: string; name: string; is_typing?: boolean }>)[0];
                    if (p?.is_typing && p.id !== userId) {
                        typing[p.id] = p.name || "Alguien";
                    }
                });
                setTypingUsers(typing);
            })
            .subscribe(async (status: string) => {
                if (status === "SUBSCRIBED") {
                    presenceChannelRef.current = presenceCh;
                    await presenceCh.track({
                        id: userId,
                        name: userFullName,
                        is_typing: false,
                    });
                }
            });

        return () => {
            supabase.removeChannel(msgChannel);
            supabase.removeChannel(presenceCh);
            presenceChannelRef.current = null;
            realtimeChannelRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeChannel?.id]);

    // ── Auto-scroll ───────────────────────────────────────────────────────────

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ── Initial load ──────────────────────────────────────────────────────────

    useEffect(() => {
        loadChannels();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Typing indicator ──────────────────────────────────────────────────────

    const handleTyping = useCallback(() => {
        if (!presenceChannelRef.current) return;
        presenceChannelRef.current.track({
            id: userId,
            name: userFullName,
            is_typing: true,
        });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            presenceChannelRef.current?.track({
                id: userId,
                name: userFullName,
                is_typing: false,
            });
        }, 2500);
    }, [userId, userFullName]);

    // ── Send message ──────────────────────────────────────────────────────────

    const handleSend = useCallback(async () => {
        const text = newMessage.trim();
        if (!text || !activeChannel || sending) return;

        setNewMessage("");
        setSending(true);

        // Auto-join if not yet a member
        await ensureMember(activeChannel.id);

        // Optimistic update
        const optimisticId = `opt-${Date.now()}`;
        lastOptimisticIdRef.current = optimisticId;
        const optimistic: ChatMessage = {
            id: optimisticId,
            channel_id: activeChannel.id,
            sender_id: userId,
            content: text,
            message_type: "text",
            created_at: new Date().toISOString(),
            sender: { full_name: "Tú" },
            reactions: [],
        };
        setMessages((prev) => [...prev, optimistic]);

        try {
            await chatService.sendMessage(supabase, activeChannel.id, text);
        } catch (err) {
            console.error("sendMessage:", err);
            // Revert optimistic on error
            lastOptimisticIdRef.current = null;
            setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
            setNewMessage(text);
        } finally {
            setSending(false);
            presenceChannelRef.current?.track({
                id: userId,
                name: userFullName,
                is_typing: false,
            });
            inputRef.current?.focus();
        }
    }, [newMessage, activeChannel, sending, userId, userFullName, supabase, ensureMember]);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ── Reactions ─────────────────────────────────────────────────────────────

    const handleReaction = useCallback(
        async (messageId: string, emoji: string) => {
            try {
                await chatService.toggleReaction(supabase, messageId, emoji);
                if (activeChannel) loadMessages(activeChannel.id);
            } catch (err) {
                console.error("toggleReaction:", err);
            }
        },
        [supabase, activeChannel, loadMessages]
    );

    // ── Create channel ────────────────────────────────────────────────────────

    const handleCreateChannel = useCallback(
        async () => {
            const name = newChannelName.trim();
            if (!name || creatingChannel) return;

            setCreatingChannel(true);
            try {
                const { data: ch, error } = await supabase
                    .from("chat_channels")
                    .insert({
                        name,
                        description: newChannelDesc.trim() || null,
                        type: newChannelPrivate ? "private" : "public",
                        tenant_id: tenantId,
                        created_by: userId,
                    })
                    .select()
                    .single();

                if (error) throw error;

                // Add creator as member
                await supabase
                    .from("chat_channel_members")
                    .insert({ channel_id: ch.id, user_id: userId });

                setChannels((prev) => [...prev, ch as ChatChannel]);
                setActiveChannel(ch as ChatChannel);
                setShowSidebar(false);
                setShowCreateModal(false);
                setNewChannelName("");
                setNewChannelDesc("");
                setNewChannelPrivate(false);
            } catch (err) {
                console.error("createChannel:", err);
            } finally {
                setCreatingChannel(false);
            }
        },
        [newChannelName, newChannelDesc, newChannelPrivate, userId, tenantId, supabase, creatingChannel]
    );

    // ── Select channel (mobile-aware) ─────────────────────────────────────────

    const selectChannel = useCallback((ch: ChatChannel) => {
        setActiveChannel(ch);
        setShowSidebar(false);
        setShowMembers(false);
    }, []);

    // ── Filtered channels ─────────────────────────────────────────────────────

    const filteredChannels = channels.filter((ch) =>
        (ch.name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ─── Render helpers ───────────────────────────────────────────────────────

    const typingNames = Object.values(typingUsers);
    const typingLabel =
        typingNames.length === 1
            ? `${typingNames[0]} está escribiendo...`
            : typingNames.length > 1
            ? `${typingNames.join(", ")} están escribiendo...`
            : "";

    const onlineCount = onlineUsers.size;

    // ─── Loading screen ───────────────────────────────────────────────────────

    if (loadingChannels) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] gap-6">
                <div className="h-20 w-20 rounded-[2rem] bg-slate-950 flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 italic">
                    Sincronizando canales...
                </p>
            </div>
        );
    }

    // ─── Main render ──────────────────────────────────────────────────────────

    return (
        <>
            {/* ═══ CREATE CHANNEL MODAL ═══════════════════════════════════════ */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="bg-slate-950 border border-white/10 rounded-[2.5rem] max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white font-black italic tracking-tight text-xl">
                            Nuevo Canal
                        </DialogTitle>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">
                            Crea un nodo de comunicacion
                        </p>
                    </DialogHeader>

                    <form onSubmit={(e) => { e.preventDefault(); handleCreateChannel(); }} className="space-y-4 mt-2">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">
                                Nombre del canal
                            </label>
                            <Input
                                value={newChannelName}
                                onChange={(e) => setNewChannelName(e.target.value)}
                                placeholder="ej. ventas-equipo"
                                className="bg-white/5 border-white/10 text-white rounded-2xl h-12 font-bold placeholder:text-slate-600 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500/30"
                                maxLength={50}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">
                                Descripcion (opcional)
                            </label>
                            <Input
                                value={newChannelDesc}
                                onChange={(e) => setNewChannelDesc(e.target.value)}
                                placeholder="Para que se usa este canal..."
                                className="bg-white/5 border-white/10 text-white rounded-2xl h-12 font-bold placeholder:text-slate-600 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500/30"
                                maxLength={120}
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => setNewChannelPrivate((v) => !v)}
                            className={cn(
                                "w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all duration-300",
                                newChannelPrivate
                                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
                                    : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                            )}
                        >
                            {newChannelPrivate ? (
                                <Lock className="h-5 w-5 shrink-0" />
                            ) : (
                                <Globe className="h-5 w-5 shrink-0" />
                            )}
                            <div className="text-left">
                                <p className="font-black text-xs">
                                    {newChannelPrivate ? "Canal Privado" : "Canal Publico"}
                                </p>
                                <p className="text-[9px] uppercase tracking-widest mt-0.5 opacity-60">
                                    {newChannelPrivate
                                        ? "Solo miembros invitados pueden unirse"
                                        : "Cualquier miembro del equipo puede ver este canal"}
                                </p>
                            </div>
                        </button>

                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                className="flex-1 h-12 rounded-2xl text-slate-400 hover:bg-white/5 hover:text-white font-black text-xs"
                                onClick={() => setShowCreateModal(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={!newChannelName.trim() || creatingChannel}
                                className="flex-1 h-12 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all duration-300 disabled:opacity-40"
                            >
                                {creatingChannel ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    "Crear Canal"
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ═══ MAIN CHAT LAYOUT ═══════════════════════════════════════════ */}
            <div className="flex h-[60vh] md:h-[calc(100vh-14rem)] rounded-2xl md:rounded-[3.5rem] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-slate-800 bg-slate-950">

                {/* ══ SIDEBAR ════════════════════════════════════════════════ */}
                <div
                    className={cn(
                        "flex flex-col bg-slate-950 transition-all duration-300",
                        "md:w-80 md:border-r md:border-white/5 md:relative md:flex",
                        showSidebar
                            ? "absolute inset-0 z-20 w-full flex"
                            : "hidden md:flex"
                    )}
                >
                    {/* Sidebar header */}
                    <div className="p-5 border-b border-white/5 flex items-center gap-3">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar canales..."
                                className="pl-11 h-11 bg-white/5 border-white/5 rounded-2xl text-xs font-bold text-white placeholder:text-slate-600 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-500/30"
                                aria-label="Buscar canales"
                            />
                        </div>
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            className="h-11 w-11 shrink-0 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-indigo-500 transition-all duration-300 p-0"
                            aria-label="Crear nuevo canal"
                        >
                            <Plus className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Online users indicator */}
                    <div className="px-5 py-3 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
                            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400">
                                {onlineCount} en linea
                            </span>
                        </div>
                        {onlineCount > 0 && (
                            <div className="flex -space-x-2 mt-2">
                                {Array.from(onlineUsers.values()).slice(0, 8).map((user) => (
                                    <div key={user.id} className="relative" title={user.name}>
                                        <Avatar className="h-7 w-7 rounded-lg border-2 border-slate-950">
                                            <AvatarFallback className="bg-indigo-500/20 text-indigo-300 text-[8px] font-black rounded-lg">
                                                {getInitials(user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-slate-950" />
                                    </div>
                                ))}
                                {onlineCount > 8 && (
                                    <div className="h-7 w-7 rounded-lg bg-white/10 border-2 border-slate-950 flex items-center justify-center">
                                        <span className="text-[8px] font-black text-slate-400">+{onlineCount - 8}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Channel list */}
                    <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                        <p className="px-4 text-[9px] font-black uppercase tracking-[0.4em] text-slate-600 mb-3 italic">
                            Nodos Activos — {filteredChannels.length}
                        </p>

                        {filteredChannels.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-4">
                                <div className="h-16 w-16 rounded-[1.5rem] bg-white/5 flex items-center justify-center">
                                    <MessageSquare className="h-8 w-8 text-slate-700" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 text-center">
                                    {searchQuery ? "Sin resultados" : "Sin canales aun"}
                                </p>
                                {!searchQuery && (
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
                                    >
                                        + Crear primer canal
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filteredChannels.map((channel) => {
                                    const isActive = activeChannel?.id === channel.id;
                                    const isPrivate = channel.type === "private";
                                    return (
                                        <button
                                            key={channel.id}
                                            onClick={() => selectChannel(channel)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group text-left",
                                                isActive
                                                    ? "bg-indigo-500/10 border border-indigo-500/20"
                                                    : "hover:bg-white/5 border border-transparent"
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0",
                                                    isActive
                                                        ? "bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] rotate-6"
                                                        : "bg-white/5 text-slate-600 group-hover:bg-white/10 group-hover:text-slate-400"
                                                )}
                                            >
                                                {isPrivate ? (
                                                    <Lock className="h-4 w-4" />
                                                ) : (
                                                    <Hash className="h-5 w-5" />
                                                )}
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p
                                                    className={cn(
                                                        "font-black text-sm truncate italic tracking-tight transition-colors",
                                                        isActive
                                                            ? "text-white"
                                                            : "text-slate-400 group-hover:text-slate-200"
                                                    )}
                                                >
                                                    {channel.name ?? "Canal"}
                                                </p>
                                                {channel.description && (
                                                    <p className="text-[9px] text-slate-600 font-bold truncate uppercase tracking-widest">
                                                        {channel.description}
                                                    </p>
                                                )}
                                            </div>
                                            {isActive && (
                                                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399] shrink-0" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Sidebar footer */}
                    <div className="p-4 border-t border-white/5">
                        <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-2xl">
                            <div className="relative shrink-0">
                                <Avatar className="h-8 w-8 rounded-xl">
                                    <AvatarFallback className="bg-indigo-500/20 text-indigo-300 text-[10px] font-black rounded-xl">
                                        {getInitials(userFullName)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-slate-950" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-xs font-black text-slate-300 truncate italic">
                                    {userFullName}
                                </p>
                                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                                    <Circle className="h-1.5 w-1.5 fill-current" />
                                    En linea
                                </p>
                            </div>
                            <ShieldCheck className="h-4 w-4 text-indigo-400/60 shrink-0" />
                        </div>
                    </div>
                </div>

                {/* ══ MESSAGES AREA ══════════════════════════════════════════ */}
                <div
                    className={cn(
                        "flex-1 flex flex-col bg-slate-900/50 min-w-0",
                        !showSidebar ? "flex" : "hidden md:flex"
                    )}
                >
                    {activeChannel ? (
                        <>
                            {/* Channel header */}
                            <div className="h-20 px-6 md:px-8 border-b border-white/5 flex items-center justify-between bg-slate-950/60 backdrop-blur-md shrink-0">
                                <div className="flex items-center gap-3 md:gap-4">
                                    {/* Mobile back button */}
                                    <button
                                        onClick={() => setShowSidebar(true)}
                                        className="md:hidden h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all shrink-0"
                                        aria-label="Volver a canales"
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </button>

                                    <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shrink-0">
                                        {activeChannel.type === "private" ? (
                                            <Lock className="h-5 w-5" />
                                        ) : (
                                            <Hash className="h-6 w-6" />
                                        )}
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="font-black text-white italic tracking-tight text-base md:text-lg leading-none truncate">
                                            {activeChannel.name}
                                        </h3>
                                        <p className="text-[9px] font-black text-slate-500 flex items-center gap-1.5 mt-1 uppercase tracking-[0.3em]">
                                            {channelMembers.length} miembros
                                            <span className="text-emerald-400 flex items-center gap-1">
                                                <Circle className="h-1.5 w-1.5 fill-current" />
                                                {channelMembers.filter((m) => onlineUsers.has(m.user_id)).length} en linea
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setShowMembers((v) => !v)}
                                        className={cn(
                                            "h-10 rounded-xl border transition-all duration-300 px-3 gap-2",
                                            showMembers
                                                ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                                                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                                        )}
                                        aria-label="Ver miembros"
                                    >
                                        <Users className="h-4 w-4" />
                                        <span className="text-[9px] font-black uppercase tracking-widest hidden md:inline">
                                            Miembros
                                        </span>
                                    </Button>
                                    <Badge className="bg-white/5 border border-white/10 text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] px-3 md:px-4 py-2 rounded-full shrink-0">
                                        <Zap className="h-3 w-3 mr-2 text-indigo-400" />
                                        Realtime
                                    </Badge>
                                </div>
                            </div>

                            {/* Content area: Messages + Members panel */}
                            <div className="flex-1 flex overflow-hidden">
                                {/* Messages list */}
                                <div
                                    className="flex-1 overflow-y-auto p-5 md:p-8 space-y-1"
                                    aria-label="Mensajes del canal"
                                    aria-live="polite"
                                >
                                    {loadingMessages ? (
                                        <div className="flex items-center justify-center py-20">
                                            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-5">
                                            <div className="h-20 w-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center">
                                                <MessageSquare className="h-10 w-10 text-slate-700" />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-black italic text-base text-white/20 uppercase tracking-tight">
                                                    Canal vacio
                                                </p>
                                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mt-1">
                                                    Se el primero en enviar un mensaje
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {messages.map((message, idx) => {
                                                const isMe = message.sender_id === userId;
                                                const prevMsg = messages[idx - 1];
                                                const isSameAuthor =
                                                    prevMsg?.sender_id === message.sender_id;
                                                const showAvatar = !isSameAuthor || idx === 0;

                                                const senderName = isMe
                                                    ? "Tú"
                                                    : message.sender?.full_name ||
                                                      senderCache[message.sender_id] ||
                                                      "Usuario";

                                                const isOptimistic = message.id.startsWith("opt-");
                                                const senderOnline = onlineUsers.has(message.sender_id);

                                                return (
                                                    <div
                                                        key={message.id}
                                                        className={cn(
                                                            "flex gap-3 group",
                                                            isMe ? "flex-row-reverse" : "flex-row",
                                                            !showAvatar ? "mt-0.5" : "mt-4"
                                                        )}
                                                    >
                                                        {/* Avatar */}
                                                        <div className="shrink-0 w-10">
                                                            {showAvatar && (
                                                                <div className="relative">
                                                                    <Avatar className="h-10 w-10 rounded-xl border border-white/10 shadow-sm">
                                                                        <AvatarFallback
                                                                            className={cn(
                                                                                "text-[10px] font-black rounded-xl",
                                                                                isMe
                                                                                    ? "bg-indigo-500/30 text-indigo-200"
                                                                                    : "bg-white/10 text-slate-400"
                                                                            )}
                                                                        >
                                                                            {getInitials(senderName)}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    {/* Online dot */}
                                                                    {senderOnline && (
                                                                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Bubble */}
                                                        <div
                                                            className={cn(
                                                                "flex flex-col gap-1 max-w-[70%]",
                                                                isMe ? "items-end" : "items-start"
                                                            )}
                                                        >
                                                            {showAvatar && (
                                                                <div
                                                                    className={cn(
                                                                        "flex items-center gap-2",
                                                                        isMe && "flex-row-reverse"
                                                                    )}
                                                                >
                                                                    <span className="font-black text-white/70 text-xs italic">
                                                                        {senderName}
                                                                    </span>
                                                                    <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">
                                                                        {formatMessageTime(message.created_at)}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            <div className="relative group/msg">
                                                                <div
                                                                    className={cn(
                                                                        "px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed transition-all duration-300",
                                                                        isMe
                                                                            ? "bg-indigo-500 text-white rounded-tr-sm shadow-[0_4px_20px_rgba(99,102,241,0.2)]"
                                                                            : "bg-white/5 text-slate-300 rounded-tl-sm border border-white/5 hover:bg-white/[0.08]",
                                                                        isOptimistic && "opacity-60"
                                                                    )}
                                                                >
                                                                    {message.content}

                                                                    {/* Delivered indicator */}
                                                                    {isMe && !isOptimistic && (
                                                                        <CheckCheck className="inline-block h-3 w-3 ml-2 text-indigo-200 opacity-70" />
                                                                    )}
                                                                </div>

                                                                {/* Reaction button (hover) */}
                                                                <div
                                                                    className={cn(
                                                                        "absolute top-1 opacity-0 group-hover/msg:opacity-100 transition-all duration-200",
                                                                        isMe ? "-left-11" : "-right-11"
                                                                    )}
                                                                >
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 rounded-xl bg-slate-950 border border-white/10 shadow-lg hover:bg-white/10 text-slate-500 hover:text-white"
                                                                                aria-label="Agregar reaccion"
                                                                            >
                                                                                <Smile className="h-4 w-4" />
                                                                            </Button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent
                                                                            side={isMe ? "left" : "right"}
                                                                            className="w-auto p-1.5 rounded-2xl bg-slate-950 border border-white/10 shadow-2xl"
                                                                        >
                                                                            <div className="flex gap-0.5">
                                                                                {QUICK_REACTIONS.map((emoji) => (
                                                                                    <button
                                                                                        key={emoji}
                                                                                        onClick={() =>
                                                                                            handleReaction(message.id, emoji)
                                                                                        }
                                                                                        className="p-2 hover:bg-white/10 rounded-xl transition-all text-lg hover:scale-125 active:scale-90"
                                                                                        aria-label={`Reaccionar con ${emoji}`}
                                                                                    >
                                                                                        {emoji}
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                </div>
                                                            </div>

                                                            {/* Reactions display */}
                                                            {message.reactions && message.reactions.length > 0 && (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {Object.entries(
                                                                        message.reactions.reduce(
                                                                            (
                                                                                acc: Record<string, number>,
                                                                                curr
                                                                            ) => {
                                                                                acc[curr.emoji] =
                                                                                    (acc[curr.emoji] || 0) + 1;
                                                                                return acc;
                                                                            },
                                                                            {}
                                                                        )
                                                                    ).map(([emoji, count]) => {
                                                                        const reacted =
                                                                            message.reactions?.some(
                                                                                (r) =>
                                                                                    r.user_id === userId &&
                                                                                    r.emoji === emoji
                                                                            ) ?? false;
                                                                        return (
                                                                            <button
                                                                                key={emoji}
                                                                                onClick={() =>
                                                                                    handleReaction(message.id, emoji)
                                                                                }
                                                                                className={cn(
                                                                                    "flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-bold transition-all hover:scale-110 active:scale-90",
                                                                                    reacted
                                                                                        ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
                                                                                        : "bg-white/5 border-white/10 text-slate-500 hover:border-white/20"
                                                                                )}
                                                                            >
                                                                                <span>{emoji}</span>
                                                                                <span>{count}</span>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div ref={messagesEndRef} />
                                        </>
                                    )}
                                </div>

                                {/* ══ MEMBERS PANEL ═════════════════════════════════ */}
                                {showMembers && (
                                    <div className="w-64 border-l border-white/5 bg-slate-950/80 flex flex-col shrink-0 hidden md:flex">
                                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">
                                                Miembros — {channelMembers.length}
                                            </p>
                                            <button
                                                onClick={() => setShowMembers(false)}
                                                className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-400 hover:bg-white/5 transition-all"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-3 space-y-1">
                                            {/* Online members first */}
                                            {channelMembers
                                                .sort((a, b) => {
                                                    const aOnline = onlineUsers.has(a.user_id) ? 0 : 1;
                                                    const bOnline = onlineUsers.has(b.user_id) ? 0 : 1;
                                                    return aOnline - bOnline;
                                                })
                                                .map((member) => {
                                                    const isOnline = onlineUsers.has(member.user_id);
                                                    const memberName =
                                                        member.user_id === userId
                                                            ? `${userFullName} (Tú)`
                                                            : member.profile?.full_name || "Usuario";
                                                    return (
                                                        <div
                                                            key={member.user_id}
                                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all"
                                                        >
                                                            <div className="relative shrink-0">
                                                                <Avatar className="h-8 w-8 rounded-lg">
                                                                    <AvatarFallback
                                                                        className={cn(
                                                                            "text-[9px] font-black rounded-lg",
                                                                            isOnline
                                                                                ? "bg-emerald-500/20 text-emerald-300"
                                                                                : "bg-white/5 text-slate-600"
                                                                        )}
                                                                    >
                                                                        {getInitials(memberName)}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div
                                                                    className={cn(
                                                                        "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950",
                                                                        isOnline ? "bg-emerald-400" : "bg-slate-600"
                                                                    )}
                                                                />
                                                            </div>
                                                            <div className="flex-1 overflow-hidden">
                                                                <p className="text-xs font-bold text-slate-300 truncate">
                                                                    {memberName}
                                                                </p>
                                                                <p
                                                                    className={cn(
                                                                        "text-[8px] font-black uppercase tracking-widest",
                                                                        isOnline ? "text-emerald-400" : "text-slate-600"
                                                                    )}
                                                                >
                                                                    {isOnline ? "En linea" : "Desconectado"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Message input */}
                            <div className="p-4 md:p-6 border-t border-white/5 bg-slate-950/80 backdrop-blur-md shrink-0">
                                {/* Typing indicator */}
                                {typingLabel && (
                                    <div className="mb-3 px-4 flex items-center gap-2">
                                        <div className="flex gap-1">
                                            <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                            <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                            <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce" />
                                        </div>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] italic">
                                            {typingLabel}
                                        </p>
                                    </div>
                                )}

                                <div
                                    className={cn(
                                        "bg-white/5 rounded-[2rem] border p-2 flex items-center gap-2 transition-all duration-300",
                                        "focus-within:border-indigo-500/30 focus-within:shadow-[0_0_20px_rgba(99,102,241,0.08)]",
                                        "border-white/10"
                                    )}
                                >
                                    <Input
                                        ref={inputRef}
                                        className="border-none focus-visible:ring-0 shadow-none font-bold text-sm placeholder:text-slate-600 text-white bg-transparent"
                                        placeholder={`Escribe en #${activeChannel.name ?? "canal"}...`}
                                        value={newMessage}
                                        onChange={(e) => {
                                            setNewMessage(e.target.value);
                                            handleTyping();
                                        }}
                                        onKeyDown={handleKeyDown}
                                        disabled={sending}
                                        aria-label="Campo de mensaje"
                                    />

                                    {newMessage.trim() && (
                                        <button
                                            onClick={() => setNewMessage("")}
                                            className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-400 hover:bg-white/5 transition-all shrink-0"
                                            aria-label="Limpiar mensaje"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}

                                    <Button
                                        onClick={handleSend}
                                        disabled={!newMessage.trim() || sending}
                                        className={cn(
                                            "h-12 w-12 rounded-xl shrink-0 transition-all duration-300 active:scale-90 p-0",
                                            newMessage.trim() && !sending
                                                ? "bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                                                : "bg-white/5 text-slate-600"
                                        )}
                                        aria-label="Enviar mensaje"
                                    >
                                        {sending ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <Send className="h-5 w-5" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Empty state — no channel selected */
                        <div className="flex-1 flex flex-col items-center justify-center gap-6">
                            <div className="h-24 w-24 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center">
                                <MessageSquare className="h-12 w-12 text-slate-700" />
                            </div>
                            <div className="text-center space-y-2">
                                <p className="font-black italic text-xl text-white/20 uppercase tracking-tight">
                                    Terminal de Comunicacion
                                </p>
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">
                                    Selecciona un canal para iniciar transmision
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-all duration-300 font-black text-xs uppercase tracking-widest"
                            >
                                <Plus className="h-4 w-4" />
                                Crear canal
                            </button>
                            {/* Mobile: show sidebar button */}
                            <button
                                onClick={() => setShowSidebar(true)}
                                className="md:hidden flex items-center gap-2 text-[10px] font-black text-slate-600 hover:text-slate-400 uppercase tracking-widest transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Ver canales
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
