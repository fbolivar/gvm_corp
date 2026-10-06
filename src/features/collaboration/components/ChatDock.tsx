"use client";

/**
 * Dock de chat global (montado en el layout principal).
 *
 * Qué resuelve: el aviso de mensaje nuevo era un toast de 6 segundos y nada
 * más — si el usuario estaba en otra pestaña o no lo vio, no quedaba rastro.
 * Ahora:
 *  - Ícono flotante siempre visible con el número de mensajes sin leer, que se
 *    actualiza en tiempo real y late cuando hay pendientes.
 *  - Panel al tocarlo: quién escribió, cuántos, hace cuánto → abre ese chat.
 *  - Aviso emergente persistente (hasta cerrarlo o abrir el chat) con el nombre
 *    y el mensaje, sonido corto y notificación del navegador si está permitida.
 *  - Contador en el título de la pestaña: "(3) GVM Corp".
 *
 * Los no leídos salen de get_chat_unread() (por canal, contra last_read_at);
 * la página de Colaboración marca la lectura al abrir cada canal.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/shared/lib/utils";

interface UnreadRow {
    channel_id: string;
    channel_name: string;
    channel_type: string;
    unread: number;
    last_sender_id: string | null;
    last_at: string;
}

function timeAgo(iso: string): string {
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    const m = Math.round(diff / 60000);
    if (m < 1) return "ahora";
    if (m < 60) return `hace ${m} min`;
    const h = Math.round(m / 60);
    if (h < 24) return `hace ${h} h`;
    return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", timeZone: "America/Bogota" });
}

/** Nombre del otro participante en un directo "A · B" (o el nombre del canal). */
function displayName(row: UnreadRow, myName: string): string {
    if (row.channel_type === "direct" && row.channel_name.includes(" · ")) {
        const other = row.channel_name.split(" · ").find(n => n.trim() !== myName.trim());
        if (other) return other;
    }
    return row.channel_name;
}

function beep() {
    try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.type = "sine"; o.frequency.value = 880; g.gain.value = 0.06;
        o.connect(g); g.connect(ctx.destination); o.start();
        o.frequency.setValueAtTime(1175, ctx.currentTime + 0.12);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        o.stop(ctx.currentTime + 0.36);
    } catch { /* sin audio: no pasa nada */ }
}


export function ChatDock() {
    const supabase = createClient();
    const router = useRouter();
    const pathname = usePathname();
    const [rows, setRows] = useState<UnreadRow[]>([]);
    const [open, setOpen] = useState(false);
    const [ready, setReady] = useState(false);
    const meRef = useRef<{ id: string; name: string } | null>(null);
    const nameCache = useRef<Map<string, string>>(new Map());
    const activeToast = useRef<string | number | null>(null);
    const total = rows.reduce((s, r) => s + Number(r.unread), 0);
    const onChat = pathname?.startsWith("/collaboration");

    const refresh = useCallback(async () => {
        const { data } = await supabase.rpc("get_chat_unread");
        setRows(((data ?? []) as UnreadRow[]).sort((a, b) => b.last_at.localeCompare(a.last_at)));
    }, [supabase]);

    const resolveName = useCallback(async (id: string) => {
        if (nameCache.current.has(id)) return nameCache.current.get(id)!;
        const { data } = await supabase.from("profiles").select("full_name").eq("id", id).maybeSingle();
        const n = data?.full_name ?? "Alguien";
        nameCache.current.set(id, n);
        return n;
    }, [supabase]);

    const openChannel = useCallback((channelId?: string) => {
        setOpen(false);
        if (activeToast.current) { toast.dismiss(activeToast.current); activeToast.current = null; }
        router.push(channelId ? `/collaboration?c=${channelId}` : "/collaboration");
    }, [router]);

    // Título de la pestaña con el contador.
    useEffect(() => {
        if (typeof document === "undefined") return;
        const clean = document.title.replace(/^\(\d+\)\s*/, "");
        document.title = total > 0 ? `(${total}) ${clean}` : clean;
    }, [total]);

    useEffect(() => {
        let cancelled = false;
        let ch: ReturnType<typeof supabase.channel> | null = null;

        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || cancelled) return;
            const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
            meRef.current = { id: user.id, name: prof?.full_name || user.email?.split("@")[0] || "Usuario" };
            await refresh();
            setReady(true);

            ch = supabase
                .channel("chat-dock")
                .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, async (payload: { new: unknown }) => {
                    const msg = payload.new as { channel_id: string; sender_id: string; content: string };
                    if (msg.sender_id === user.id) return;
                    // ¿Me compete? Si el canal aparece en mis no leídos, sí (la RPC ya
                    // filtra por mis membresías; sirve también para DMs recién creados).
                    const { data } = await supabase.rpc("get_chat_unread");
                    const next = ((data ?? []) as UnreadRow[]).sort((a, b) => b.last_at.localeCompare(a.last_at));
                    setRows(next);
                    if (!next.some(r => r.channel_id === msg.channel_id)) return;
                    // En la página del chat, con ese canal abierto, no hace falta avisar.
                    if (window.location.pathname.startsWith("/collaboration") && window.location.search.includes(msg.channel_id)) return;

                    const sender = await resolveName(msg.sender_id);
                    const preview = (msg.content || "📎 Archivo").slice(0, 120);
                    beep();
                    if (activeToast.current) toast.dismiss(activeToast.current);
                    activeToast.current = toast(sender, {
                        description: preview,
                        icon: <MessageCircle className="h-4 w-4 text-indigo-600" />,
                        duration: Infinity,
                        action: { label: "Abrir chat", onClick: () => openChannel(msg.channel_id) },
                    });
                    if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
                        const n = new Notification(`${sender} — GVM Corp`, { body: preview, tag: msg.channel_id });
                        n.onclick = () => { window.focus(); openChannel(msg.channel_id); };
                    }
                })
                // Al marcar leído (desde la página del chat) el badge baja solo.
                .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_channel_members", filter: `user_id=eq.${user.id}` }, () => refresh())
                .subscribe();
        })();

        const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            cancelled = true;
            document.removeEventListener("visibilitychange", onVisible);
            if (ch) supabase.removeChannel(ch);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Pide permiso de notificaciones del navegador la primera vez que el usuario toca el dock.
    const askPermission = () => {
        if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
    };

    if (!ready || onChat) return null;
    const me = meRef.current;

    return (
        <div className="fixed z-[60] right-4 bottom-4 md:right-6 md:bottom-6 flex flex-col items-end gap-3" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            {open && (
                <div className="w-[min(92vw,340px)] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Mensajes</p>
                        <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
                    </div>
                    {rows.length === 0 ? (
                        <p className="px-4 py-6 text-xs text-slate-500 text-center">Sin mensajes pendientes.</p>
                    ) : (
                        <ul className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                            {rows.map(r => (
                                <li key={r.channel_id}>
                                    <button type="button" onClick={() => openChannel(r.channel_id)} className="w-full text-left px-4 py-3 hover:bg-indigo-50/60 flex items-center gap-3">
                                        <span className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center shrink-0">
                                            {displayName(r, me?.name ?? "").slice(0, 2).toUpperCase()}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-xs font-bold text-slate-900 truncate">{displayName(r, me?.name ?? "")}</span>
                                            <span className="block text-[11px] text-slate-500">{r.unread} {Number(r.unread) === 1 ? "mensaje nuevo" : "mensajes nuevos"} · {timeAgo(r.last_at)}</span>
                                        </span>
                                        <span className="h-5 min-w-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">{r.unread}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <button type="button" onClick={() => openChannel()} className="w-full px-4 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 border-t border-slate-100">
                        Ir a Colaboración
                    </button>
                </div>
            )}

            <button
                type="button"
                onClick={() => { askPermission(); setOpen(o => !o); }}
                aria-label={total > 0 ? `${total} mensajes sin leer` : "Chat del equipo"}
                className={cn(
                    "relative h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all",
                    total > 0 ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300",
                )}
            >
                {total > 0 && <span className="absolute inset-0 rounded-full bg-indigo-500/40 animate-ping motion-reduce:hidden" />}
                <MessageCircle className="h-6 w-6 relative" />
                {total > 0 && (
                    <span className="absolute -top-1 -right-1 h-6 min-w-6 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center border-2 border-white">
                        {total > 99 ? "99+" : total}
                    </span>
                )}
            </button>
        </div>
    );
}
