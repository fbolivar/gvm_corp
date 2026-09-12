"use client";

import {
    useEffect,
    useState,
    useRef,
    useCallback,
    useMemo,
    type KeyboardEvent,
} from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { chatService } from "../services/chatService";
import { ChatChannel, ChatMessage, ChatMember } from "../types";
import { useOnlinePresence } from "../hooks/useOnlinePresence";
import {
    Send,
    Hash,
    Search,
    MessageSquare,
    Loader2,
    Smile,
    Plus,
    ArrowLeft,
    Lock,
    Globe,
    X,
    CheckCheck,
    Users,
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
import { cn } from "@/shared/lib/utils";
import { Hint } from "@/shared/components/ui/hint";
import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DirectoryMember {
    user_id: string;
    full_name: string;
    role?: string | null;
    email?: string | null;
}

interface Props {
    userId: string;
    userFullName: string;
    tenantId: string;
    members?: DirectoryMember[];
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
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

// Color determinista por usuario para el avatar (tema claro)
const AVATAR_COLORS = [
    "bg-indigo-100 text-indigo-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-sky-100 text-sky-700",
    "bg-rose-100 text-rose-700",
    "bg-violet-100 text-violet-700",
    "bg-teal-100 text-teal-700",
    "bg-orange-100 text-orange-700",
];
function avatarColor(id: string): string {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const QUICK_REACTIONS = ["👍", "❤️", "🔥", "😂", "😮", "🚀"];

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatInterface({ userId, userFullName, tenantId, members = [] }: Props) {
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
    // Sidebar tab: personas | canales
    const [sidebarTab, setSidebarTab] = useState<"people" | "channels">("people");
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
        } catch (err) {
            console.error("loadChannels:", err);
        } finally {
            setLoadingChannels(false);
        }
    }, [supabase]);

    // ── Load messages for a channel ───────────────────────────────────────────

    const loadMessages = useCallback(
        async (channelId: string) => {
            setLoadingMessages(true);
            try {
                const data = await chatService.getMessages(supabase, channelId);

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
            const mem = await chatService.getChannelMembers(supabase, channelId);
            setChannelMembers(mem);
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

    // ── Realtime subscription (messages + typing) ─────────────────────────────

    useEffect(() => {
        if (!activeChannel) return;

        loadMessages(activeChannel.id);
        loadChannelMembers(activeChannel.id);

        // Al abrir el chat, marca leídas sus notificaciones de la campana.
        supabase
            .from("app_notifications")
            .update({ is_read: true })
            .eq("user_id", userId)
            .eq("link", `/collaboration?c=${activeChannel.id}`)
            .eq("is_read", false)
            .then(() => {});

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

                    if (incoming.sender_id !== userId) {
                        const name = await resolveSenderName(incoming.sender_id);
                        incoming.sender = { full_name: name };
                    } else {
                        incoming.sender = { full_name: "Tú" };
                    }

                    setMessages((prev) => {
                        const optId = lastOptimisticIdRef.current;
                        if (optId && incoming.sender_id === userId) {
                            lastOptimisticIdRef.current = null;
                            return prev.map((m) => (m.id === optId ? incoming : m));
                        }
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
                    await presenceCh.track({ id: userId, name: userFullName, is_typing: false });
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
        presenceChannelRef.current.track({ id: userId, name: userFullName, is_typing: true });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            presenceChannelRef.current?.track({ id: userId, name: userFullName, is_typing: false });
        }, 2500);
    }, [userId, userFullName]);

    // ── Send message ──────────────────────────────────────────────────────────

    const handleSend = useCallback(async () => {
        const text = newMessage.trim();
        if (!text || !activeChannel || sending) return;

        setNewMessage("");
        setSending(true);

        await ensureMember(activeChannel.id);

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
            lastOptimisticIdRef.current = null;
            setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
            setNewMessage(text);
            toast.error("No se pudo enviar el mensaje");
        } finally {
            setSending(false);
            presenceChannelRef.current?.track({ id: userId, name: userFullName, is_typing: false });
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

    const handleCreateChannel = useCallback(async () => {
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

            await supabase
                .from("chat_channel_members")
                .insert({ channel_id: ch.id, user_id: userId });

            setChannels((prev) => [...prev, ch as ChatChannel]);
            setActiveChannel(ch as ChatChannel);
            setSidebarTab("channels");
            setShowSidebar(false);
            setShowCreateModal(false);
            setNewChannelName("");
            setNewChannelDesc("");
            setNewChannelPrivate(false);
        } catch (err) {
            console.error("createChannel:", err);
            toast.error("No se pudo crear el canal");
        } finally {
            setCreatingChannel(false);
        }
    }, [newChannelName, newChannelDesc, newChannelPrivate, userId, tenantId, supabase, creatingChannel]);

    // ── Iniciar mensaje directo con un usuario ────────────────────────────────

    const startDirectMessage = useCallback(
        async (otherId: string, otherName: string) => {
            if (!otherId || otherId === userId || !tenantId) return;
            try {
                const ch = await chatService.openDirectChannel(supabase, {
                    me: userId,
                    meName: userFullName,
                    other: otherId,
                    otherName,
                    tenantId,
                });
                setChannels((prev) => (prev.some((c) => c.id === ch.id) ? prev : [ch, ...prev]));
                setActiveChannel(ch);
                setShowSidebar(false);
                setShowMembers(false);
            } catch (err) {
                console.error("startDirectMessage:", err);
                toast.error("No se pudo abrir la conversación");
            }
        },
        [userId, userFullName, tenantId, supabase]
    );

    // ── Select channel (mobile-aware) ─────────────────────────────────────────

    const selectChannel = useCallback((ch: ChatChannel) => {
        setActiveChannel(ch);
        setShowSidebar(false);
        setShowMembers(false);
    }, []);

    // ─── Derived ──────────────────────────────────────────────────────────────

    const filteredChannels = useMemo(
        () => channels.filter((ch) => (ch.name ?? "").toLowerCase().includes(searchQuery.toLowerCase())),
        [channels, searchQuery]
    );

    // Directorio: excluye al usuario actual, ordena online primero, filtra por búsqueda
    const directory = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return members
            .filter((m) => m.user_id !== userId)
            .filter((m) => !q || m.full_name.toLowerCase().includes(q) || (m.role ?? "").toLowerCase().includes(q))
            .sort((a, b) => {
                const ao = onlineUsers.has(a.user_id) ? 0 : 1;
                const bo = onlineUsers.has(b.user_id) ? 0 : 1;
                if (ao !== bo) return ao - bo;
                return a.full_name.localeCompare(b.full_name, "es");
            });
    }, [members, userId, searchQuery, onlineUsers]);

    const onlineDirCount = useMemo(
        () => members.filter((m) => m.user_id !== userId && onlineUsers.has(m.user_id)).length,
        [members, userId, onlineUsers]
    );

    const typingNames = Object.values(typingUsers);
    const typingLabel =
        typingNames.length === 1
            ? `${typingNames[0]} está escribiendo…`
            : typingNames.length > 1
            ? `${typingNames.join(", ")} están escribiendo…`
            : "";

    const channelIcon = (ch: ChatChannel) =>
        ch.type === "direct" ? Users : ch.type === "private" ? Lock : Hash;

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex h-[72vh] min-h-[520px] rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            {/* ══════════════════ SIDEBAR ══════════════════ */}
            <aside
                className={cn(
                    "w-full md:w-80 md:shrink-0 border-r border-slate-200 flex flex-col bg-slate-50/60",
                    showSidebar ? "flex" : "hidden md:flex"
                )}
            >
                {/* Search */}
                <div className="p-3 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar personas o canales…"
                            className="h-9 pl-9 bg-white border-slate-200 text-sm rounded-xl"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-3 pt-3 flex items-center gap-1">
                    {([
                        { key: "people", label: "Personas", count: onlineDirCount },
                        { key: "channels", label: "Canales", count: null },
                    ] as const).map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => setSidebarTab(t.key)}
                            className={cn(
                                "flex items-center gap-2 px-3 h-8 rounded-lg text-xs font-semibold transition-colors",
                                sidebarTab === t.key
                                    ? "bg-indigo-600 text-white"
                                    : "text-slate-500 hover:bg-slate-100"
                            )}
                        >
                            {t.label}
                            {t.key === "people" && t.count > 0 && (
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-1 text-[10px] font-bold",
                                        sidebarTab === t.key ? "text-emerald-200" : "text-emerald-600"
                                    )}
                                >
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    {t.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* PEOPLE TAB */}
                {sidebarTab === "people" && (
                    <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                        {directory.length === 0 ? (
                            <div className="py-12 text-center text-slate-400">
                                <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                <p className="text-xs">Sin otros usuarios en la empresa</p>
                            </div>
                        ) : (
                            directory.map((m) => {
                                const online = onlineUsers.has(m.user_id);
                                return (
                                    <button
                                        key={m.user_id}
                                        type="button"
                                        onClick={() => startDirectMessage(m.user_id, m.full_name)}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white hover:shadow-sm text-left transition-all"
                                        title={`Chatear con ${m.full_name}`}
                                    >
                                        <div className="relative shrink-0">
                                            <Avatar className="h-9 w-9 rounded-xl">
                                                <AvatarFallback className={cn("text-[11px] font-bold rounded-xl", avatarColor(m.user_id))}>
                                                    {getInitials(m.full_name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span
                                                className={cn(
                                                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white",
                                                    online ? "bg-emerald-500" : "bg-slate-300"
                                                )}
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-800 truncate">{m.full_name}</p>
                                            <p className="text-[11px] text-slate-400 truncate">
                                                {m.role || "—"}{online ? " · En línea" : ""}
                                            </p>
                                        </div>
                                        <MessageSquare className="h-4 w-4 text-slate-300 shrink-0" />
                                    </button>
                                );
                            })
                        )}
                    </div>
                )}

                {/* CHANNELS TAB */}
                {sidebarTab === "channels" && (
                    <div className="flex-1 overflow-y-auto p-2">
                        <div className="flex items-center justify-between px-2 py-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {filteredChannels.length} canal{filteredChannels.length === 1 ? "" : "es"}
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(true)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                            >
                                <Plus className="h-3.5 w-3.5" /> Nuevo
                            </button>
                        </div>

                        {loadingChannels ? (
                            <div className="py-10 flex justify-center">
                                <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                            </div>
                        ) : filteredChannels.length === 0 ? (
                            <div className="py-10 text-center text-slate-400">
                                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                <p className="text-xs mb-3">{searchQuery ? "Sin resultados" : "Aún no hay canales"}</p>
                                {!searchQuery && (
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                                    >
                                        + Crear primer canal
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-0.5">
                                {filteredChannels.map((ch) => {
                                    const Icon = channelIcon(ch);
                                    const isActive = activeChannel?.id === ch.id;
                                    return (
                                        <button
                                            key={ch.id}
                                            onClick={() => selectChannel(ch)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                                                isActive ? "bg-indigo-600 text-white shadow-sm" : "text-slate-700 hover:bg-white hover:shadow-sm"
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                                                    isActive ? "bg-white/15" : "bg-slate-100"
                                                )}
                                            >
                                                <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-500")} />
                                            </div>
                                            <span className="text-sm font-semibold truncate flex-1">{ch.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </aside>

            {/* ══════════════════ MAIN ══════════════════ */}
            <section className={cn("flex-1 min-w-0 flex-col bg-white", showSidebar ? "hidden md:flex" : "flex")}>
                {!activeChannel ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 text-slate-400">
                        <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                            <MessageSquare className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="text-sm font-semibold text-slate-600">Selecciona una persona o canal</p>
                        <p className="text-xs mt-1">Toca a un compañero en “Personas” para chatear en directo.</p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="h-14 px-4 flex items-center gap-3 border-b border-slate-100 shrink-0">
                            <Hint label="Volver" side="top">
                                <button
                                    type="button"
                                    onClick={() => setShowSidebar(true)}
                                    className="md:hidden h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </button>
                            </Hint>
                            <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                {(() => {
                                    const Icon = channelIcon(activeChannel);
                                    return <Icon className="h-4 w-4 text-slate-500" />;
                                })()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900 truncate">{activeChannel.name}</p>
                                <p className="text-[11px] text-slate-400">
                                    {channelMembers.length} miembro{channelMembers.length === 1 ? "" : "s"}
                                    {typingLabel ? ` · ${typingLabel}` : ""}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowMembers((s) => !s)}
                                className={cn(
                                    "h-9 px-3 rounded-lg inline-flex items-center gap-1.5 text-xs font-semibold transition-colors",
                                    showMembers ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-100"
                                )}
                            >
                                <Users className="h-4 w-4" /> <span className="hidden sm:inline">Miembros</span>
                            </button>
                        </div>

                        <div className="flex-1 min-h-0 flex">
                            {/* Messages */}
                            <div className="flex-1 min-w-0 flex flex-col">
                                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                                    {loadingMessages ? (
                                        <div className="h-full flex items-center justify-center">
                                            <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                            <MessageSquare className="h-8 w-8 mb-2 text-slate-200" />
                                            <p className="text-sm font-medium">Aún no hay mensajes</p>
                                            <p className="text-xs">Sé el primero en escribir.</p>
                                        </div>
                                    ) : (
                                        messages.map((message, idx) => {
                                            const isMe = message.sender_id === userId;
                                            const prevMsg = messages[idx - 1];
                                            const showAvatar = prevMsg?.sender_id !== message.sender_id || idx === 0;
                                            const senderName = isMe
                                                ? "Tú"
                                                : message.sender?.full_name || senderCache[message.sender_id] || "Usuario";
                                            const isOptimistic = message.id.startsWith("opt-");

                                            const grouped = message.reactions?.reduce((acc: Record<string, number>, r) => {
                                                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                                return acc;
                                            }, {});

                                            return (
                                                <div
                                                    key={message.id}
                                                    className={cn(
                                                        "flex gap-2.5 group",
                                                        isMe ? "flex-row-reverse" : "flex-row",
                                                        showAvatar ? "mt-3" : "mt-0.5"
                                                    )}
                                                >
                                                    <div className="w-8 shrink-0">
                                                        {showAvatar && !isMe && (
                                                            <Avatar className="h-8 w-8 rounded-lg">
                                                                <AvatarFallback className={cn("text-[10px] font-bold rounded-lg", avatarColor(message.sender_id))}>
                                                                    {getInitials(senderName)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        )}
                                                    </div>

                                                    <div className={cn("flex flex-col gap-1 max-w-[78%]", isMe ? "items-end" : "items-start")}>
                                                        {showAvatar && (
                                                            <div className={cn("flex items-center gap-2 px-1", isMe && "flex-row-reverse")}>
                                                                <span className="text-xs font-semibold text-slate-700">{senderName}</span>
                                                                <span className="text-[10px] text-slate-400">{formatMessageTime(message.created_at)}</span>
                                                            </div>
                                                        )}

                                                        <div className="relative group/msg">
                                                            <div
                                                                className={cn(
                                                                    "px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words",
                                                                    isMe
                                                                        ? "bg-indigo-600 text-white rounded-tr-sm"
                                                                        : "bg-slate-100 text-slate-800 rounded-tl-sm",
                                                                    isOptimistic && "opacity-60"
                                                                )}
                                                            >
                                                                {message.content}
                                                                {isMe && !isOptimistic && (
                                                                    <CheckCheck className="inline-block h-3 w-3 ml-1.5 text-indigo-200 align-middle" />
                                                                )}
                                                            </div>

                                                            {/* Reaction picker (hover) */}
                                                            <div
                                                                className={cn(
                                                                    "absolute -top-2 opacity-0 group-hover/msg:opacity-100 transition-opacity",
                                                                    isMe ? "-left-9" : "-right-9"
                                                                )}
                                                            >
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-400 hover:text-slate-700"
                                                                            aria-label="Reaccionar"
                                                                        >
                                                                            <Smile className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent
                                                                        side={isMe ? "left" : "right"}
                                                                        className="w-auto p-1.5 rounded-xl"
                                                                    >
                                                                        <div className="flex gap-0.5">
                                                                            {QUICK_REACTIONS.map((emoji) => (
                                                                                <button
                                                                                    key={emoji}
                                                                                    onClick={() => handleReaction(message.id, emoji)}
                                                                                    className="p-1.5 hover:bg-slate-100 rounded-lg text-lg hover:scale-125 transition-transform"
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
                                                        {grouped && Object.keys(grouped).length > 0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {Object.entries(grouped).map(([emoji, count]) => {
                                                                    const reacted = message.reactions?.some(
                                                                        (r) => r.emoji === emoji && r.user_id === userId
                                                                    );
                                                                    return (
                                                                        <button
                                                                            key={emoji}
                                                                            onClick={() => handleReaction(message.id, emoji)}
                                                                            className={cn(
                                                                                "inline-flex items-center gap-1 px-2 h-6 rounded-full text-xs border transition-colors",
                                                                                reacted
                                                                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                                                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                                                            )}
                                                                        >
                                                                            <span>{emoji}</span>
                                                                            <span className="font-semibold">{count}</span>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Typing */}
                                {typingLabel && (
                                    <div className="px-5 pb-1 flex items-center gap-2">
                                        <span className="flex gap-1">
                                            <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                            <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                            <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce" />
                                        </span>
                                        <span className="text-[11px] text-slate-400">{typingLabel}</span>
                                    </div>
                                )}

                                {/* Input */}
                                <div className="p-3 border-t border-slate-100 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            ref={inputRef}
                                            value={newMessage}
                                            onChange={(e) => {
                                                setNewMessage(e.target.value);
                                                handleTyping();
                                            }}
                                            onKeyDown={handleKeyDown}
                                            placeholder={`Mensaje en ${activeChannel.name}…`}
                                            className="h-11 rounded-xl bg-slate-50 border-slate-200 text-sm"
                                        />
                                        <Hint label="Enviar mensaje" side="top">
                                            <Button
                                                onClick={handleSend}
                                                disabled={sending || !newMessage.trim()}
                                                className="h-11 w-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 p-0 shrink-0"
                                                aria-label="Enviar"
                                            >
                                                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                            </Button>
                                        </Hint>
                                    </div>
                                </div>
                            </div>

                            {/* Members panel */}
                            {showMembers && (
                                <div className="w-60 border-l border-slate-100 bg-slate-50/60 flex-col hidden lg:flex">
                                    <div className="h-12 px-4 flex items-center justify-between border-b border-slate-100">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            Miembros — {channelMembers.length}
                                        </span>
                                        <Hint label="Cerrar panel" side="top">
                                            <button onClick={() => setShowMembers(false)} className="text-slate-400 hover:text-slate-600">
                                                <X className="h-4 w-4" />
                                            </button>
                                        </Hint>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                                        {channelMembers.map((member) => {
                                            const online = onlineUsers.has(member.user_id);
                                            const isSelf = member.user_id === userId;
                                            const memberName = isSelf ? `${userFullName} (Tú)` : member.profile?.full_name || "Usuario";
                                            return (
                                                <div
                                                    key={member.user_id}
                                                    onClick={isSelf ? undefined : () => startDirectMessage(member.user_id, member.profile?.full_name || "Usuario")}
                                                    title={isSelf ? undefined : `Chatear con ${memberName}`}
                                                    className={cn(
                                                        "flex items-center gap-2.5 px-2 py-2 rounded-lg",
                                                        isSelf ? "" : "hover:bg-white cursor-pointer"
                                                    )}
                                                >
                                                    <div className="relative shrink-0">
                                                        <Avatar className="h-7 w-7 rounded-lg">
                                                            <AvatarFallback className={cn("text-[9px] font-bold rounded-lg", avatarColor(member.user_id))}>
                                                                {getInitials(memberName)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white", online ? "bg-emerald-500" : "bg-slate-300")} />
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-700 truncate">{memberName}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </section>

            {/* ══════════════════ CREATE CHANNEL MODAL ══════════════════ */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="sm:max-w-[440px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Nuevo canal</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); handleCreateChannel(); }} className="space-y-4 mt-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-600">Nombre del canal</label>
                            <Input
                                value={newChannelName}
                                onChange={(e) => setNewChannelName(e.target.value)}
                                placeholder="ej. logística, ventas-bogotá…"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-600">Descripción (opcional)</label>
                            <Input
                                value={newChannelDesc}
                                onChange={(e) => setNewChannelDesc(e.target.value)}
                                placeholder="¿De qué trata el canal?"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setNewChannelPrivate((p) => !p)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors",
                                newChannelPrivate ? "border-indigo-200 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"
                            )}
                        >
                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", newChannelPrivate ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500")}>
                                {newChannelPrivate ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800">{newChannelPrivate ? "Privado" : "Público"}</p>
                                <p className="text-[11px] text-slate-500">
                                    {newChannelPrivate ? "Solo los miembros invitados pueden verlo" : "Todo el equipo puede unirse"}
                                </p>
                            </div>
                        </button>
                        <div className="flex justify-end gap-2 pt-1">
                            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={creatingChannel || !newChannelName.trim()} className="bg-indigo-600 hover:bg-indigo-700">
                                {creatingChannel ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear canal"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
