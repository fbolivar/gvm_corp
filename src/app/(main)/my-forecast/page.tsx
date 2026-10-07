import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MyForecastEditor, type EditorLine } from '@/features/procurement-forecast/components/MyForecastEditor';

export const metadata = { title: 'Mi Pronóstico — GVM Corp' };

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default async function MyForecastPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: period } = await supabase
        .from('forecast_periods')
        .select('id, year, month, status')
        .order('year', { ascending: false }).order('month', { ascending: false })
        .limit(1)
        .maybeSingle();

    let lines: EditorLine[] = [];
    if (period) {
        const { data } = await supabase
            .from('forecast_lines')
            .select('id, product_label, abc_class, suggested_qty, forecast_qty, is_one_off, submitted_at')
            .eq('period_id', period.id)
            .eq('salesperson_id', user.id)
            .order('abc_class', { ascending: true })
            .order('suggested_qty', { ascending: false });
        lines = (data ?? []) as EditorLine[];
    }

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500 max-w-5xl">
            <div>
                <h1 className="text-lg font-bold text-slate-900">Mi Pronóstico de Ventas</h1>
                <p className="text-sm text-slate-500">
                    {period
                        ? `Período ${MONTHS[period.month - 1]} ${period.year} · ${period.status === 'OPEN' ? 'abierto' : 'cerrado'}`
                        : 'No hay un período de pronóstico abierto por el momento.'}
                </p>
            </div>

            {period ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                    <p className="text-xs text-slate-500">
                        Ajusta las cantidades que esperas vender el próximo mes. El sugerido es el promedio de tus últimos 6 meses.
                        Marca &quot;puntual&quot; lo que no se debe reponer.
                    </p>
                    <MyForecastEditor lines={lines} readOnly={period.status !== 'OPEN'} />
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center text-sm text-slate-400">
                    Cuando el área de Compras abra la campaña de pronóstico, aquí verás tu portafolio para ajustar.
                </div>
            )}
        </div>
    );
}
