import type { SupabaseClient } from '@supabase/supabase-js';
import { CalendarCheck, Users, Target, Gauge } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { visitService } from '@/features/crm/services/visitService';
import { accountService } from '@/features/crm/services/accountService';
import { kpiService } from '@/features/crm/services/kpiService';
import { monthRange } from '@/features/crm/utils/visitStats';
import { salespersonKpis, classifyClient, classificationCounts } from '@/features/crm/utils/visitKpi';
import { CLIENT_CATEGORIES, CLIENT_CATEGORY_STYLE, SEMAPHORE_STYLE, type ClientCategory } from '@/features/crm/types/kpi';
import { KpiThresholdsPanel } from './KpiThresholdsPanel';
import { ExportKpiButton, type KpiClientRow } from './ExportKpiButton';

function monthLabel(period: string): string {
    const [y, m] = period.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

const CATEGORY_ORDER: ClientCategory[] = ['EN_CRECIMIENTO', 'ACTIVO', 'EN_CAIDA', 'PASIVO', 'INACTIVO', 'POTENCIAL'];

interface Props {
    supabase: SupabaseClient;
    userId: string;
    today: string;
    month: string;
    isManager: boolean;
}

/**
 * Tablero de KPIs de visitas: cumplimiento por comercial (semáforo configurable)
 * y clasificación de clientes derivada de los pedidos reales. Server component
 * reutilizable por la página dedicada y por la vista por defecto del planeador.
 */
export async function VisitKpisDashboard({ supabase, userId, today, month, isManager }: Props) {
    const [visits, salespeople, targets, settings, accounts] = await Promise.all([
        visitService.list(supabase, monthRange(`${month}-15`)),
        visitService.getSalespeople(supabase, userId),
        kpiService.getVisitTargets(supabase, month),
        kpiService.getSettings(supabase),
        accountService.listAccounts(supabase, today),
    ]);

    const spKpis = salespersonKpis(visits, salespeople.map(s => ({ id: s.id, name: s.name })), targets, settings, today);
    const counts = classificationCounts(accounts, settings);
    const totalClients = accounts.length || 1;

    const nameOf = new Map(salespeople.map(s => [s.id, s.name]));
    const clientRows: KpiClientRow[] = accounts.map(a => ({
        cliente: a.legal_name,
        comercial: a.salesperson_id ? (nameOf.get(a.salesperson_id) ?? 'Comercial') : 'Sin asignar',
        categoria: CLIENT_CATEGORIES[classifyClient(a, settings)],
        ultima_compra: a.last_purchase_date ?? '—',
        dias_sin_compra: a.days_since_purchase,
        pedidos: a.orders_count,
        ventas_periodo: a.sales_ytd,
        variacion_30d: a.var_30d_pct,
    }));

    const totalPlanned = spKpis.reduce((s, r) => s + r.planned, 0);
    const totalDone = spKpis.reduce((s, r) => s + r.realizada, 0);
    const globalPct = totalPlanned === 0 ? 0 : Math.round((totalDone / totalPlanned) * 100);

    return (
        <div className="space-y-6">
            {/* Controles: mes + export */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <form method="GET" className="flex items-center gap-2">
                    <input type="month" name="month" defaultValue={month}
                        className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm" />
                    <Button type="submit" variant="outline" className="h-11 px-4 rounded-xl text-xs font-bold">Ver</Button>
                </form>
                <ExportKpiButton salespeople={spKpis} clients={clientRows} period={month} />
            </div>

            {/* Resumen del mes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard icon={CalendarCheck} label={`Visitas planeadas · ${monthLabel(month)}`} value={String(totalPlanned)} />
                <SummaryCard icon={Target} label="Visitas realizadas" value={String(totalDone)} />
                <SummaryCard icon={Gauge} label="Cumplimiento global" value={`${globalPct}%`}
                    tint={globalPct >= settings.visit_green_pct ? 'text-emerald-600' : globalPct >= settings.visit_amber_pct ? 'text-amber-600' : 'text-rose-600'} />
                <SummaryCard icon={Users} label="Clientes en cartera" value={String(accounts.length)} />
            </div>

            {/* Clasificación de clientes */}
            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 md:p-6 space-y-4">
                <div>
                    <h3 className="text-sm font-black text-slate-800">Clasificación de clientes</h3>
                    <p className="text-[11px] text-slate-400">Calculada automáticamente desde los pedidos reales, con los umbrales de abajo.</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {CATEGORY_ORDER.map(cat => {
                        const style = CLIENT_CATEGORY_STYLE[cat];
                        const n = counts[cat];
                        const pct = Math.round((n / totalClients) * 100);
                        return (
                            <div key={cat} className={`rounded-2xl border border-slate-100 p-3.5 ${style.bg}`}>
                                <div className="flex items-center gap-1.5">
                                    <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                                    <span className={`text-2xl font-black ${style.text}`}>{n}</span>
                                </div>
                                <p className={`mt-1 text-[11px] font-bold leading-tight ${style.text}`}>{CLIENT_CATEGORIES[cat]}</p>
                                <p className="text-[10px] text-slate-400">{pct}% de la cartera</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Cumplimiento por comercial */}
            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 md:p-6 pb-3">
                    <h3 className="text-sm font-black text-slate-800">Cumplimiento por comercial — {monthLabel(month)}</h3>
                    <p className="text-[11px] text-slate-400">Cumplimiento = realizadas ÷ planeadas. La meta de visitas se define en el tablero del equipo.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-y border-slate-100 bg-slate-50/50">
                                <th className="text-left font-bold px-5 py-2.5">Comercial</th>
                                <th className="text-center font-bold px-3 py-2.5">Planeadas</th>
                                <th className="text-center font-bold px-3 py-2.5">Realizadas</th>
                                <th className="text-center font-bold px-3 py-2.5">Pend.</th>
                                <th className="text-center font-bold px-3 py-2.5">No real.</th>
                                <th className="text-left font-bold px-5 py-2.5 w-52">Cumplimiento</th>
                                <th className="text-center font-bold px-3 py-2.5">Meta</th>
                                <th className="text-center font-bold px-3 py-2.5">Vencidos</th>
                            </tr>
                        </thead>
                        <tbody>
                            {spKpis.length === 0 && (
                                <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400">No hay comerciales con cartera ni visitas en el período.</td></tr>
                            )}
                            {spKpis.map(r => (
                                <tr key={r.salesperson_id} className="border-b border-slate-50 hover:bg-slate-50/40">
                                    <td className="px-5 py-3 font-semibold text-slate-700">{r.salesperson_name}</td>
                                    <td className="text-center px-3 py-3 text-slate-600">{r.planned}</td>
                                    <td className="text-center px-3 py-3 font-bold text-slate-800">{r.realizada}</td>
                                    <td className="text-center px-3 py-3 text-slate-500">{r.pendiente}</td>
                                    <td className="text-center px-3 py-3 text-slate-500">{r.no_realizada}</td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${SEMAPHORE_STYLE[r.semaphore]}`} />
                                            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                                <div className={`h-full rounded-full ${SEMAPHORE_STYLE[r.semaphore]}`} style={{ width: `${Math.min(r.compliance_pct, 100)}%` }} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 w-10 text-right">{r.compliance_pct}%</span>
                                        </div>
                                    </td>
                                    <td className="text-center px-3 py-3 text-slate-500">
                                        {r.target_visits != null ? `${r.realizada}/${r.target_visits}${r.target_pct != null ? ` · ${r.target_pct}%` : ''}` : '—'}
                                    </td>
                                    <td className="text-center px-3 py-3">
                                        {r.overdue > 0 ? <span className="text-rose-600 font-bold">{r.overdue}</span> : <span className="text-slate-300">0</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <KpiThresholdsPanel initial={settings} canEdit={isManager} />
        </div>
    );
}

function SummaryCard({ icon: Icon, label, value, tint }: { icon: React.ElementType; label: string; value: string; tint?: string }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <Icon className="h-4 w-4 text-slate-300" />
            <p className={`mt-2 text-2xl font-black ${tint ?? 'text-slate-800'}`}>{value}</p>
            <p className="text-[11px] text-slate-400 leading-tight mt-0.5 capitalize">{label}</p>
        </div>
    );
}
