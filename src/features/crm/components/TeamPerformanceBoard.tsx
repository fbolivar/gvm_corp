import Link from 'next/link';
import { Target, Settings2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { TeamMemberPerformance } from '../services/accountService';
import type { TargetAttainment } from '../utils/accountSummary';

/**
 * Tablero del gerente: meta vs. venta del mes por comercial con "ritmo"
 * (a hoy debería ir en X %), proyección, cartera activa, alertas y visitas.
 */

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const cell = 'px-3 py-2.5 text-xs tabular-nums text-right whitespace-nowrap';

const STATUS: Record<TargetAttainment['status'], { label: string; cls: string; bar: string }> = {
    ADELANTE: { label: 'Adelante', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' },
    AL_DIA: { label: 'Al día', cls: 'bg-sky-50 text-sky-700 border-sky-200', bar: 'bg-sky-500' },
    ATRASADO: { label: 'Atrasado', cls: 'bg-rose-50 text-rose-700 border-rose-200', bar: 'bg-rose-500' },
    SIN_META: { label: 'Sin meta', cls: 'bg-slate-100 text-slate-500 border-slate-200', bar: 'bg-slate-300' },
};

export function TeamPerformanceBoard({ team, period, isManager }: { team: TeamMemberPerformance[]; period: string; isManager: boolean }) {
    // El cumplimiento global solo compara a quienes tienen meta; la venta del
    // mes sí suma a todo el equipo.
    const withTarget = team.filter(m => m.sales.target > 0);
    const totalTarget = withTarget.reduce((s, m) => s + m.sales.target, 0);
    const totalAchieved = team.reduce((s, m) => s + m.sales.achieved, 0);
    const achievedWithTarget = withTarget.reduce((s, m) => s + m.sales.achieved, 0);
    const totalPct = totalTarget > 0 ? Math.round((achievedWithTarget / totalTarget) * 100) : null;
    const expected = team[0]?.sales.expected_pct ?? 0;
    const label = new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)) - 1, 1))
        .toLocaleDateString('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });

    return (
        <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <Target className="h-4 w-4 text-indigo-500" />
                <h2 className="text-sm font-black text-slate-900">Metas del equipo · {label}</h2>
                <span className="text-[11px] text-slate-400">ritmo esperado a hoy: {expected} %</span>
                {isManager && (
                    <Link href={`/crm/targets?period=${period}`} className="ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-700">
                        <Settings2 className="h-3.5 w-3.5" /> Definir metas
                    </Link>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Kpi label="Meta del mes" value={cop.format(totalTarget)} />
                <Kpi label="Venta del mes" value={cop.format(totalAchieved)} tone="indigo" />
                <Kpi label="Cumplimiento" value={totalPct === null ? '—' : `${totalPct} %`} tone={totalPct === null ? 'slate' : totalPct >= expected ? 'emerald' : 'rose'} sub={totalPct === null ? 'define metas para medirlo' : `esperado ${expected} % · ${withTarget.length} con meta`} />
                <Kpi label="Visitas realizadas" value={String(team.reduce((s, m) => s + m.visits_done, 0))} sub={`de ${team.reduce((s, m) => s + m.visits_planned, 0)} planeadas`} />
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                <th className="px-3 py-2.5 text-left">Comercial</th>
                                <th className="px-3 py-2.5 text-right">Meta</th>
                                <th className="px-3 py-2.5 text-right">Venta</th>
                                <th className="px-3 py-2.5 text-left w-48">Cumplimiento</th>
                                <th className="px-3 py-2.5 text-right">Proyección</th>
                                <th className="px-3 py-2.5 text-right">Cartera</th>
                                <th className="px-3 py-2.5 text-right">Activos</th>
                                <th className="px-3 py-2.5 text-right">Alertas</th>
                                <th className="px-3 py-2.5 text-right">Visitas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {team.length === 0 && (
                                <tr><td colSpan={9} className="px-5 py-8 text-center text-xs text-slate-400">Aún no hay cartera asignada ni metas. Empieza repartiendo clientes en «Cartera».</td></tr>
                            )}
                            {team.map(m => {
                                const st = STATUS[m.sales.status];
                                const pct = m.sales.attainment_pct ?? 0;
                                return (
                                    <tr key={m.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                            <Link href={`/crm/accounts?salesperson=${m.id}`} className="text-xs font-bold text-slate-900 hover:text-indigo-600">{m.name}</Link>
                                            {m.role && <p className="text-[10px] text-slate-400">{m.role}</p>}
                                        </td>
                                        <td className={cell}>{m.sales.target > 0 ? cop.format(m.sales.target) : <span className="text-slate-300">—</span>}</td>
                                        <td className={cn(cell, 'font-bold text-slate-900')}>{cop.format(m.sales.achieved)}</td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden relative">
                                                    <div className={cn('h-full rounded-full', st.bar)} style={{ width: `${Math.min(100, pct)}%` }} />
                                                    <div className="absolute top-0 h-full w-px bg-slate-500/60" style={{ left: `${m.sales.expected_pct}%` }} title={`Esperado ${m.sales.expected_pct} %`} />
                                                </div>
                                                <span className="text-xs font-bold tabular-nums w-12 text-right">{m.sales.attainment_pct === null ? '—' : `${Math.round(pct)} %`}</span>
                                                <span className={cn('inline-flex px-2 py-0.5 rounded-lg border text-[10px] font-bold', st.cls)}>{st.label}</span>
                                            </div>
                                        </td>
                                        <td className={cn(cell, 'text-slate-500')}>{cop.format(m.sales.projected)}</td>
                                        <td className={cell}>{m.accounts}</td>
                                        <td className={cell}>{m.active_accounts}</td>
                                        <td className={cn(cell, m.alerts > 0 && 'text-amber-600 font-bold')}>{m.alerts}</td>
                                        <td className={cell}>{m.visits_done}{m.target_visits > 0 ? ` / ${m.target_visits}` : ''}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}

function Kpi({ label, value, sub, tone = 'slate' }: { label: string; value: string; sub?: string; tone?: 'slate' | 'indigo' | 'emerald' | 'rose' }) {
    const tones = { slate: 'text-slate-900', indigo: 'text-indigo-600', emerald: 'text-emerald-600', rose: 'text-rose-600' };
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className={cn('text-2xl font-bold tracking-tight mt-1 truncate', tones[tone])}>{value}</p>
            {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
        </div>
    );
}
