"use client";

/**
 * Mantiene "caliente" la sesión de Supabase para que la navegación no se demore
 * tras un largo periodo de inactividad.
 *
 * Problema: cuando la pestaña queda en segundo plano, el navegador estrangula los
 * timers y el auto-refresh del token no corre → el access token expira. Al volver
 * y navegar, CADA request (incluidos los prefetch del menú) intenta refrescar el
 * token en el servidor, a veces en paralelo (refresh-token rotation → reintentos),
 * y eso hace lenta la primera navegación.
 *
 * Fix: al recuperar el foco/visibilidad, hacemos UN solo refresh en el cliente
 * (singleton). Como @supabase/ssr guarda la sesión en cookies, ese refresh deja
 * el token válido para el middleware y los Server Components → la navegación ya no
 * paga el refresh.
 */

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function SessionKeepAlive() {
    useEffect(() => {
        const supabase = createClient();
        let refreshing = false;

        const warm = async () => {
            if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
            if (refreshing) return;
            refreshing = true;
            try {
                const { data } = await supabase.auth.getSession(); // local, sin red
                const expMs = data.session?.expires_at ? data.session.expires_at * 1000 : 0;
                // Si ya expiró o vence en < 90s, refresca de una vez (un solo request).
                if (data.session && (!expMs || expMs - Date.now() < 90_000)) {
                    await supabase.auth.refreshSession();
                }
            } catch {
                /* silencioso — el auto-refresh normal seguirá intentando */
            } finally {
                refreshing = false;
            }
        };

        const onVisible = () => {
            if (document.visibilityState === "visible") warm();
        };

        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("focus", onVisible);
        // Calienta también al montar (por si el token ya venció al cargar).
        warm();

        return () => {
            document.removeEventListener("visibilitychange", onVisible);
            window.removeEventListener("focus", onVisible);
        };
    }, []);

    return null;
}
