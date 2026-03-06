"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OnlineUser } from "../types";

/**
 * Hook reutilizable para presencia online via Supabase Realtime.
 * Se suscribe al canal `online:{tenantId}` y trackea al usuario actual.
 * Retorna un Map de usuarios en línea.
 */
export function useOnlinePresence(
    tenantId: string,
    userId: string,
    userFullName: string
): Map<string, OnlineUser> {
    const supabase = createClient();
    const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineUser>>(new Map());
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    useEffect(() => {
        const presenceKey = `online:${tenantId}`;
        const channel = supabase.channel(presenceKey);

        channel
            .on("presence", { event: "sync" }, () => {
                const state = channel.presenceState();
                const online = new Map<string, OnlineUser>();
                Object.values(state).forEach((presences) => {
                    const p = (presences as Array<{ id: string; name: string; avatar_url?: string }>)[0];
                    if (p) {
                        online.set(p.id, { id: p.id, name: p.name, avatar_url: p.avatar_url });
                    }
                });
                setOnlineUsers(online);
            })
            .subscribe(async (status: string) => {
                if (status === "SUBSCRIBED") {
                    await channel.track({
                        id: userId,
                        name: userFullName,
                    });
                }
            });

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tenantId, userId, userFullName]);

    return onlineUsers;
}
