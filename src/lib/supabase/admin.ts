import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase con Service Role Key.
 * ⚠️ SOLO para uso en Server-Side (API Routes, Server Actions).
 * NUNCA exponer al cliente ni importar desde componentes 'use client'.
 */
export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
        throw new Error('Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    }

    return createClient(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
