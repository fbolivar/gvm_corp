"use client";

/**
 * Componente global (montado en el layout principal) que:
 *  1. Marca al usuario como "en línea" en el canal de presencia del tenant,
 *     para que aparezca conectado en Colaboración aunque no esté en esa página.
 *  2. Escucha mensajes nuevos de chat en los canales del usuario y muestra una
 *     alerta emergente (toast) cuando alguien le escribe.
 */

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { MessageSquare } from "lucide-react";
import { ensureTenantPresence } from "../hooks/useOnlinePresence";

export function ChatPresence() {
    const supabase = createClient();
    const memberChannelIds = useRef<Set<string>>(new Set());
    const nameCache = useRef<Map<string, string>>(new Map());

    useEffect(() => {
        let releasePresence: (() => void) | null = null;
        let messagesCh: ReturnType<typeof supabase.channel> | null = null;
        let cancelled = false;

        const resolveName = async (id: string): Promise<string> => {
            if (nameCache.current.has(id)) return nameCache.current.get(id)!;
            const { data } = await supabase.from("profiles").select("full_name").eq("id", id).maybeSingle();
            const name = data?.full_name ?? "Alguien";
            nameCache.current.set(id, name);
            return name;
        };

        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || cancelled) return;

            const [{ data: ut }, { data: prof }] = await Promise.all([
                supabase.from("user_tenants").select("tenant_id").eq("user_id", user.id).maybeSingle(),
                supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
            ]);
            const tenantId = ut?.tenant_id;
            if (!tenantId || cancelled) return;
            const myName = prof?.full_name || user.email?.split("@")[0] || "Usuario";

            // 1) Presencia global (canal singleton compartido con la página de chat)
            releasePresence = ensureTenantPresence(tenantId, user.id, myName);

            // 2) Canales a los que pertenece (para saber qué mensajes me competen)
            const { data: memberRows } = await supabase
                .from("chat_channel_members")
                .select("channel_id")
                .eq("user_id", user.id);
            memberChannelIds.current = new Set((memberRows ?? []).map((r: { channel_id: string }) => r.channel_id));

            // 3) Escucha mensajes nuevos del tenant y notifica los que me llegan
            messagesCh = supabase
                .channel(`chat-notify:${tenantId}`)
                .on(
                    "postgres_changes",
                    { event: "INSERT", schema: "public", table: "chat_messages" },
                    async (payload: { new: unknown }) => {
                        const msg = payload.new as { id: string; channel_id: string; sender_id: string; content: string };
                        if (msg.sender_id === user.id) return; // no me notifico a mí mismo

                        // ¿El mensaje es de un canal donde estoy? (revalida por si es un DM nuevo)
                        let mine = memberChannelIds.current.has(msg.channel_id);
                        if (!mine) {
                            const { data: m } = await supabase
                                .from("chat_channel_members")
                                .select("id")
                                .eq("channel_id", msg.channel_id)
                                .eq("user_id", user.id)
                                .maybeSingle();
                            if (m) {
                                memberChannelIds.current.add(msg.channel_id);
                                mine = true;
                            }
                        }
                        if (!mine) return;

                        // Si ya estoy en el chat, no hace falta el toast
                        if (typeof window !== "undefined" && window.location.pathname.startsWith("/collaboration")) return;

                        const senderName = await resolveName(msg.sender_id);
                        const preview = (msg.content || "").slice(0, 90);
                        toast(senderName, {
                            description: preview,
                            icon: <MessageSquare className="h-4 w-4 text-indigo-600" />,
                            duration: 6000,
                            action: {
                                label: "Abrir",
                                onClick: () => { window.location.href = "/collaboration"; },
                            },
                        });
                    }
                )
                .subscribe();
        };

        init();

        return () => {
            cancelled = true;
            if (releasePresence) releasePresence();
            if (messagesCh) supabase.removeChannel(messagesCh);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}
