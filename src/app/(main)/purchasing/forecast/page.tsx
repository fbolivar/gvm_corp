import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { SalesReportImporter } from '@/features/procurement-forecast/components/SalesReportImporter';
import { PortfolioExplorer } from '@/features/procurement-forecast/components/PortfolioExplorer';
import { getPortfolios } from '@/features/procurement-forecast/services/forecastHistoryService';
import { ForecastPeriodPanel } from '@/features/procurement-forecast/components/ForecastPeriodPanel';
import { MyForecastEditor, type EditorLine } from '@/features/procurement-forecast/components/MyForecastEditor';
import { ConsolidatedTable } from '@/features/procurement-forecast/components/ConsolidatedTable';
import { getConsolidatedForecast, type Consolidated } from '@/features/procurement-forecast/services/consolidatedService';
import { AccuracyTable } from '@/features/procurement-forecast/components/AccuracyTable';
import { getForecastAccuracy } from '@/features/procurement-forecast/services/accuracyService';
import type { SalespersonAccuracy } from '@/features/procurement-forecast/services/forecastAccuracy';
import { MissingProductsPanel } from '@/features/procurement-forecast/components/MissingProductsPanel';
import { getMissingProducts, type MissingProduct } from '@/features/procurement-forecast/services/missingProductsService';

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

    const portfolios = await getPortfolios(supabase).catch(() => []);

    const { data: isMgr } = await supabase.rpc('is_purchasing_manager');
    const isManager = isMgr === true;

    const { data: period } = await supabase
        .from('forecast_periods')
        .select('id, year, month, status')
        .order('year', { ascending: false }).order('month', { ascending: false })
        .limit(1)
        .maybeSingle();

    let myLines: EditorLine[] = [];
    if (period) {
        const { data } = await supabase
            .from('forecast_lines')
            .select('id, product_label, abc_class, suggested_qty, forecast_qty, is_one_off, submitted_at')
            .eq('period_id', period.id)
            .eq('salesperson_id', user.id)
            .order('abc_class', { ascending: true })
            .order('suggested_qty', { ascending: false });
        myLines = (data ?? []) as EditorLine[];
    }

    let consolidated: Consolidated | null = null;
    let accuracy: { rows: SalespersonAccuracy[]; hasActuals: boolean } | null = null;
    let missing: MissingProduct[] = [];
    if (period && isManager) {
        consolidated = await getConsolidatedForecast(supabase, period.id).catch(() => null);
        accuracy = await getForecastAccuracy(supabase, period).catch(() => null);
    }
    if (isManager) {
        missing = await getMissingProducts(supabase).catch(() => []);
    }

    const now = new Date();
    const nextMonth = now.getUTCMonth() + 2 > 12 ? 1 : now.getUTCMonth() + 2;
    const nextYear = now.getUTCMonth() + 2 > 12 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Forecast de Compras"
                subtitle="Panel de Compras — planeación de demanda por comercial"
                tenant={tenant}
            />

            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">Cómo funciona el mes</p>
                <ol className="text-xs text-indigo-900/80 space-y-1 list-decimal pl-4">
                    <li><strong>Compras</strong> importa el informe de ventas del mes (abajo) y <strong>abre el período</strong>.</li>
                    <li>Cada <strong>comercial</strong> entra a <strong>&quot;Mi Pronóstico&quot;</strong> (en su menú) y ajusta sus cantidades.</li>
                    <li><strong>Compras</strong> revisa el <strong>consolidado</strong>, compra, y al final <strong>cierra el período</strong>.</li>
                </ol>
                <p className="text-[11px] text-indigo-900/60 mt-2">Esta pantalla es para Compras. Los comerciales no entran aquí: ellos usan &quot;Mi Pronóstico&quot;.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                <h2 className="text-sm font-bold text-slate-900">Período de pronóstico</h2>
                <ForecastPeriodPanel period={period ?? null} isManager={isManager} defaultYear={nextYear} defaultMonth={nextMonth} />
            </div>

            <details className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 group">
                <summary className="cursor-pointer text-sm font-bold text-slate-900 flex items-center justify-between">
                    <span>Importar informe de ventas <span className="font-normal text-slate-400">· una vez al mes</span></span>
                    <span className="text-xs text-slate-400 group-open:hidden">mostrar</span>
                </summary>
                <div className="mt-4 space-y-4">
                    <p className="text-xs text-slate-500">
                        Sube el informe de ventas exportado de WorldOffice (la hoja de detalle de ventas). El sistema carga el histórico
                        por comercial y producto. Reimportar un mes reemplaza sus datos, no los duplica.
                    </p>
                    {lastImport && (
                        <p className="text-[11px] text-slate-400">
                            Última importación: {new Date(lastImport.imported_at as string).toLocaleString('es-CO')}
                        </p>
                    )}
                    <SalesReportImporter />
                </div>
            </details>

            {period && myLines.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">Mi pronóstico</h2>
                        <p className="text-xs text-slate-500">Tus productos como comercial. Ajusta las cantidades y marca &quot;puntual&quot; lo que no se debe reponer.</p>
                    </div>
                    <MyForecastEditor lines={myLines} readOnly={period.status !== 'OPEN'} />
                </div>
            )}

            {consolidated && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">Consolidado para compra</h2>
                        <p className="text-xs text-slate-500">Suma del pronóstico de todos los comerciales por producto (excluye lo marcado puntual). Exportable a CSV.</p>
                    </div>
                    <ConsolidatedTable data={consolidated} />
                </div>
            )}

            {accuracy && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">Precisión del pronóstico</h2>
                        <p className="text-xs text-slate-500">Pronosticado vs. vendido real del mes del período. Toca un comercial para ver el detalle por producto.</p>
                    </div>
                    <AccuracyTable rows={accuracy.rows} hasActuals={accuracy.hasActuals} />
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                <div>
                    <h2 className="text-sm font-bold text-slate-900">Histórico y clasificación ABC por comercial</h2>
                    <p className="text-xs text-slate-500">
                        Últimos 6 meses con datos. ABC por costo (A hasta 92%, B hasta 99% o más de $600.000, C el resto).
                        El promedio es la base del pronóstico sugerido.
                    </p>
                </div>
                <PortfolioExplorer portfolios={portfolios} />
            </div>

            {isManager && (
                <details className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 group">
                    <summary className="cursor-pointer text-sm font-bold text-slate-900 flex items-center justify-between">
                        <span>Productos por cargar en el catálogo {missing.length > 0 && <span className="ml-1 text-rose-600">({missing.length})</span>}</span>
                        <span className="text-xs text-slate-400 group-open:hidden">mostrar</span>
                    </summary>
                    <div className="mt-4">
                        <MissingProductsPanel products={missing} />
                    </div>
                </details>
            )}
        </div>
    );
}
