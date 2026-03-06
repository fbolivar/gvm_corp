import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/auth/signout-all
 * Cierra TODAS las sesiones del usuario autenticado (sign-out global).
 * Usa el admin client con service_role para ejecutar signOut con scope 'global'.
 */
export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autenticado' },
                { status: 401 }
            );
        }

        const admin = createAdminClient();
        const { error } = await admin.auth.admin.signOut(user.id, 'global');

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, message: 'Todas las sesiones han sido cerradas' });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Error interno' },
            { status: 500 }
        );
    }
}
