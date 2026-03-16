import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/petty-cash/[fundId]/transactions
 * Returns the transaction list for a single petty cash fund.
 * Used by PettyCashClient to lazily load and refresh transactions.
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ fundId: string }> }
) {
    try {
        const { fundId } = await params;

        if (!fundId) {
            return NextResponse.json({ error: 'fundId requerido' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { data: transactions, error } = await supabase
            .from('petty_cash_transactions')
            .select('*')
            .eq('fund_id', fundId)
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ transactions: transactions ?? [] });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno del servidor';
        console.error('[petty-cash/transactions] GET error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
