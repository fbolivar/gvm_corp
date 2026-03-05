import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { abcAnalysisService } from '@/features/inventory/services/abcAnalysisService';
import { ABCAnalysisClient } from './client';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { settingsService } from '@/features/settings/services/settingsService';

export const metadata = { title: 'Análisis ABC — GVM Corp' };

export default async function ABCAnalysisPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [{ products, summary }, tenant] = await Promise.all([
        abcAnalysisService
            .getAnalysis(supabase, 90)
            .catch(() => ({
                products: [],
                summary: {
                    totalProducts: 0,
                    classA: { count: 0, pctValue: 0, pctItems: 0 },
                    classB: { count: 0, pctValue: 0, pctItems: 0 },
                    classC: { count: 0, pctValue: 0, pctItems: 0 },
                    totalStockValue: 0,
                    avgRotation: 0,
                    slowMovers: 0,
                },
            })),
        settingsService.getTenantInfo(supabase),
    ]);

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Análisis ABC"
                subtitle="Inventario — Clasificación Pareto y Rotación"
                tenant={tenant}
            />

            <ABCAnalysisClient initialProducts={products} initialSummary={summary} />
        </div>
    );
}
