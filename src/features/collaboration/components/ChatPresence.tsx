"use client";

/**
 * Componente global (montado en el layout principal) que:
 *  1. Marca al usuario como "en línea" en el canal de presencia del tenant,
 *     para que aparezca conectado en Colaboración aunque no esté en esa página.
 *  2. (Desde 2026-09-17 los avisos de mensajes nuevos los da ChatDock.)
 */

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureTenantPresence } from "../hooks/useOnlinePresence";

export function ChatPresence() {
    const supabase = createClient();

    useEffect(() => {
        let releasePresence: (() => void) | null = null;
        let cancelled = false;

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

            // Presencia global (canal singleton compartido con la página de chat)
            releasePresence = ensureTenantPresence(tenantId, user.id, myName);
        };

        init();

        return () => {
            cancelled = true;
            if (releasePresence) releasePresence();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
}
