import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { pettyCashService } from '@/features/treasury/services/pettyCashService';

/**
 * GET /api/petty-cash/funds
 * Returns all petty cash funds for the current tenant.
 * Used by PettyCashClient to refresh fund list after mutations.
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const funds = await pettyCashService.getFunds(supabase);
        return NextResponse.json({ funds });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno del servidor';
        console.error('[petty-cash/funds] GET error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
