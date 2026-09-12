import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fixedAssetService } from '@/features/accounting/services/fixedAssetService';

export const runtime = 'nodejs';
export const maxDuration = 120;

/** GET /api/cron/depreciation — Vercel Cron (1º de cada mes 4am UTC) */
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    try {
        const r = await fixedAssetService.runMonthlyDepreciation(admin);

        // Notificar en pantalla (a nivel de cada tenant con activos)
        if (r.processed > 0) {
            const { data: tenants } = await admin.from('tenants').select('id');
            for (const t of tenants ?? []) {
                await admin.from('app_notifications').insert({
                    tenant_id: t.id,
                    user_id: null,
                    title: 'Depreciación mensual aplicada',
                    body: `Se depreciaron ${r.processed} activo(s) por $${Math.round(r.totalDepreciated).toLocaleString('es-CO')}.`,
                    link: '/accounting/fixed-assets',
                    category: 'ACCOUNTING',
                    priority: 'LOW',
                    is_read: false,
                });
            }
        }

        return NextResponse.json({ message: 'Depreciación mensual', ...r, timestamp: new Date().toISOString() });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error';
        console.error('[Cron Depreciation] Fatal:', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
