import { FileCheck2, TrendingUp } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { QuotationConversion } from '@/features/crm/services/quotationConversionService';

function monthLabel(ym: string): string {
    const [y, m] = ym.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('es-CO', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}
function monthLong(ym: string): string {
    const [y, m] = ym.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Tono del % según qué tan alta es la conversión. */
function tone(pct: number | null): string {
    if (pct === null) return 'text-slate-400';
    if (pct >= 50) return 'text-emerald-600';
    if (pct >= 30) return 'text-amber-600';
    return 'text-rose-600';
}
function barColor(pct: number | null): string {
    if (pct === null) return 'bg-slate-200';
    if (pct >= 50) return 'bg-emerald-500';
    if (pct >= 30) return 'bg-amber-400';
    return 'bg-rose-400';
}

/**
 * KPI: % de cotizaciones que pasan a ser ventas (cotización → pedido/factura),
 * con el dato del mes y la tendencia de los últimos 3 meses.
 */
export function QuotationConversionCard({ data, scopeLabel }: { data: QuotationConversion; scopeLabel: string }) {
    const { current, months } = data;
    return (
        <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 md:p-6">
            <div className="flex flex-col lg:flex-row gap-6 lg:items-center">
                {/* Titular */}
                <div className="flex items-start gap-4 lg:min-w-[320px]">
                    <div className="h-11 w-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <FileCheck2 className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-slate-800">Conversión de cotizaciones a ventas</p>
                        <p className="text-[11px] text-slate-400">De las cotizaciones de {monthLong(current.ym)} {scopeLabel}, cuántas se volvieron pedido o factura.</p>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className={cn('text-4xl font-black tracking-tight', tone(current.pct))}>
                                {current.pct === null ? '—' : `${current.pct}%`}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                                {current.converted} de {current.total} cotizaciones
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tendencia 3 meses */}
                <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5" /> Últimos 3 meses
                    </p>
                    <div className="flex items-end gap-4">
                        {months.map(m => (
                            <div key={m.ym} className="flex-1 flex flex-col items-center gap-1.5">
                                <span className={cn('text-sm font-black', tone(m.pct))}>{m.pct === null ? '—' : `${m.pct}%`}</span>
                                <div className="w-full h-20 bg-slate-50 rounded-xl flex items-end overflow-hidden">
                                    <div className={cn('w-full rounded-xl transition-all', barColor(m.pct))}
                                        style={{ height: `${Math.max(m.pct ?? 0, 2)}%` }} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 capitalize">{monthLabel(m.ym)}</span>
                                <span className="text-[10px] text-slate-400">{m.converted}/{m.total}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
