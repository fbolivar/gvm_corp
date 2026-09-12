"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OnlineUser } from "../types";

/**
 * Presencia online compartida (singleton por cliente).
 *
 * Problema que resuelve: si varios componentes (p. ej. el layout global y la
 * página de chat) se suscriben por separado al MISMO canal `online:{tenantId}`,
 * Supabase Realtime no maneja bien dos joins al mismo topic en un solo cliente
 * y la presencia se corrompe (muestra de menos). Aquí mantenemos UN solo canal
 * por tenant, con conteo de referencias, y todos los consumidores leen de él.
 */

interface Entry {
    channel: ReturnType<ReturnType<typeof createClient>["channel"]>;
    online: Map<string, OnlineUser>;
    listeners: Set<() => void>;
    refCount: number;
}

const registry = new Map<string, Entry>();

function getOrCreate(tenantId: string, userId: string, userName: string): Entry {
    const existing = registry.get(tenantId);
    if (existing) return existing;

    const supabase = createClient();
    const channel = supabase.channel(`online:${tenantId}`, {
        config: { presence: { key: userId } },
    });

    const entry: Entry = { channel, online: new Map(), listeners: new Set(), refCount: 0 };

    channel
        .on("presence", { event: "sync" }, () => {
            const state = channel.presenceState();
            const online = new Map<string, OnlineUser>();
            Object.values(state).forEach((presences) => {
                const p = (presences as Array<{ id: string; name: string; avatar_url?: string }>)[0];
                if (p?.id) online.set(p.id, { id: p.id, name: p.name, avatar_url: p.avatar_url });
            });
            entry.online = online;
            entry.listeners.forEach((l) => l());
        })
        .subscribe(async (status: string) => {
            if (status === "SUBSCRIBED") {
                await channel.track({ id: userId, name: userName });
            }
        });

    registry.set(tenantId, entry);
    return entry;
}

function release(tenantId: string) {
    const entry = registry.get(tenantId);
    if (!entry) return;
    entry.refCount -= 1;
    if (entry.refCount <= 0) {
        try {
            entry.channel.unsubscribe();
        } catch {
            /* noop */
        }
        registry.delete(tenantId);
    }
}

/**
 * Mantiene viva la presencia del tenant de forma imperativa (para montar en el
 * layout global). Devuelve una función para liberar la referencia.
 */
export function ensureTenantPresence(tenantId: string, userId: string, userName: string): () => void {
    if (!tenantId || !userId) return () => {};
    const entry = getOrCreate(tenantId, userId, userName);
    entry.refCount += 1;
    let released = false;
    return () => {
        if (released) return;
        released = true;
        release(tenantId);
    };
}

/**
 * Hook para leer los usuarios en línea del tenant. Comparte el mismo canal
 * singleton, así que no crea suscripciones duplicadas.
 */
export function useOnlinePresence(
    tenantId: string,
    userId: string,
    userFullName: string
): Map<string, OnlineUser> {
    const [, force] = useState(0);

    useEffect(() => {
        if (!tenantId || !userId) return;
        const entry = getOrCreate(tenantId, userId, userFullName);
        entry.refCount += 1;
        const listener = () => force((n) => n + 1);
        entry.listeners.add(listener);
        listener(); // sincroniza estado inicial

        return () => {
            entry.listeners.delete(listener);
            release(tenantId);
        };
    }, [tenantId, userId, userFullName]);

    return registry.get(tenantId)?.online ?? new Map();
}
