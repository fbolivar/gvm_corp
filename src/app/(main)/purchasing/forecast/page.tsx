import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { SalesReportImporter } from '@/features/procurement-forecast/components/SalesReportImporter';

export const metadata = { title: 'Forecast de Compras — GVM Corp' };

export default async function ProcurementForecastPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) redirect('/login');

    const { data: lastImport } = await supabase
        .from('sales_history_import')
        .select('year, month, imported_at')
        .order('imported_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Forecast de Compras"
                subtitle="Planeación de demanda — histórico de ventas por comercial (informe de Viviana)"
                tenant={tenant}
            />

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4 max-w-3xl">
                <div>
                    <h2 className="text-sm font-bold text-slate-900">Importar informe de ventas</h2>
                    <p className="text-xs text-slate-500">
                        Sube el informe general de Viviana (hoja BASE). El sistema carga el histórico por comercial y producto.
                        Reimportar un mes reemplaza sus datos, no los duplica.
                    </p>
                    {lastImport && (
                        <p className="text-[11px] text-slate-400 mt-1">
                            Última importación: {new Date(lastImport.imported_at as string).toLocaleString('es-CO')}
                        </p>
                    )}
                </div>
                <SalesReportImporter />
            </div>
        </div>
    );
}
