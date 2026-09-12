import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase con Service Role Key.
 * ⚠️ SOLO para uso en Server-Side (API Routes, Server Actions).
 * NUNCA exponer al cliente ni importar desde componentes 'use client'.
 *
 * @param actorId  Opcional: id del usuario que ejecuta la acción. Como el service
 *   role no tiene `auth.uid()`, se envía en el header `x-actor-id` para que el
 *   trigger de auditoría registre a la persona real en vez de "Sistema".
 */
export function createAdminClient(actorId?: string | null) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
        throw new Error('Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    }

    return createClient(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        },
        ...(actorId ? { global: { headers: { 'x-actor-id': actorId } } } : {}),
    });
}
