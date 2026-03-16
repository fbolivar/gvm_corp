import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { crmService } from '@/features/crm/services/crmService';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { ForecastChart, ForecastMonthRow, ActualMonthRow } from '@/features/crm/components/ForecastChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';
import Link from 'next/link';
import {
    TrendingUp,
    Target,
    CheckCircle2,
    Layers,
    Percent,
    Users,
    Calendar,
    ExternalLink,
    ArrowRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssigneeRow {
    user_id: string | null;
    full_name: string;
    opp_count: number;
    nominal: number;
    weighted: number;
    commit_val: number;
    best_case: number;
    pipeline_val: number;
}

interface UpcomingClose {
    id: string;
    name: string;
    value: number;
    probability: number;
    stage: string;
    expected_close_date: string;
    parties: { legal_name: string } | null;
}

export const metadata = { title: 'Forecast Comercial — GVM Corp' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCOP(value: number): string {
    return `$${value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatCOPShort(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toLocaleString('es-CO')}`;
}

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
    } catch {
        return dateStr;
    }
}

const STAGE_LABELS: Record<string, string> = {
    PROSPECTING: 'Prospeccion',
    QUALIFICATION: 'Calificacion',
    PROPOSAL: 'Propuesta',
    NEGOTIATION: 'Negociacion',
    CLOSED_WON: 'Ganada',
    CLOSED_LOST: 'Perdida',
};

const STAGE_COLORS: Record<string, string> = {
    PROSPECTING: 'bg-slate-50 text-slate-500',
    QUALIFICATION: 'bg-blue-50 text-blue-600',
    PROPOSAL: 'bg-amber-50 text-amber-600',
    NEGOTIATION: 'bg-indigo-50 text-indigo-600',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ForecastPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const defaultStats = {
        forecastValue: 0, pipelineValue: 0, winRate: 0,
        openOpportunitiesCount: 0, closedWonCount: 0,
        totalLeads: 0, newLeads: 0, convertedLeads: 0,
        stagesDistribution: {} as Record<string, number>,
        leadFunnel: { new: 0, contacted: 0, qualified: 0, converted: 0 },
        recentLeads: [] as unknown[], recentOpportunities: [] as unknown[],
    };

    async function fetchMonthlySales(): Promise<ActualMonthRow[]> {
        try {
            const { data } = await supabase.rpc('get_monthly_sales');
            return (data ?? []) as ActualMonthRow[];
        } catch { return []; }
    }

    const [
        forecastByMonth,
        forecastByAssignee,
        upcomingCloses,
        dashboardStats,
        monthlySales,
        tenant,
    ] = await Promise.all([
        crmService.getForecastByMonth(supabase, 6).catch((): ForecastMonthRow[] => []),
        crmService.getForecastByAssignee(supabase).catch((): AssigneeRow[] => []),
        crmService.getUpcomingCloses(supabase, 10).catch((): UpcomingClose[] => []),
        crmService.getDashboardStats(supabase).catch(() => defaultStats),
        fetchMonthlySales(),
        settingsService.getTenantInfo(supabase),
    ]);

    // Aggregate totals from RPCs
    const totalWeighted = forecastByMonth.reduce((s: number, r: ForecastMonthRow) => s + (Number(r.weighted) || 0), 0);
    const totalCommit = forecastByMonth.reduce((s: number, r: ForecastMonthRow) => s + (Number(r.commit_val) || 0), 0);
    const totalBestCase = forecastByMonth.reduce((s: number, r: ForecastMonthRow) => s + (Number(r.best_case) || 0), 0);
    const totalPipeline = forecastByMonth.reduce((s: number, r: ForecastMonthRow) => s + (Number(r.pipeline_val) || 0), 0);
    const totalOpps = forecastByMonth.reduce((s: number, r: ForecastMonthRow) => s + (Number(r.opp_count) || 0), 0);

    // Pre-compute assignee totals
    const assigneeRows: AssigneeRow[] = forecastByAssignee;
    const assigneeTotalOpps = assigneeRows.reduce((s: number, r: AssigneeRow) => s + Number(r.opp_count), 0);
    const assigneeTotalNominal = assigneeRows.reduce((s: number, r: AssigneeRow) => s + Number(r.nominal), 0);
    const assigneeTotalCommit = assigneeRows.reduce((s: number, r: AssigneeRow) => s + Number(r.commit_val), 0);
    const assigneeTotalBestCase = assigneeRows.reduce((s: number, r: AssigneeRow) => s + Number(r.best_case), 0);
    const assigneeTotalPipeline = assigneeRows.reduce((s: number, r: AssigneeRow) => s + Number(r.pipeline_val), 0);
    const assigneeTotalWeighted = assigneeRows.reduce((s: number, r: AssigneeRow) => s + Number(r.weighted), 0);

    // Typed upcoming closes
    const closesRows: UpcomingClose[] = upcomingCloses;

    const kpis = [
        {
            label: 'Forecast Ponderado',
            value: formatCOPShort(totalWeighted),
            detail: `${totalOpps} oportunidades abiertas`,
            icon: TrendingUp,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
        },
        {
            label: 'Commit (>=90%)',
            value: formatCOPShort(totalCommit),
            detail: 'Alta probabilidad de cierre',
            icon: CheckCircle2,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
        },
        {
            label: 'Best Case (50-89%)',
            value: formatCOPShort(totalBestCase),
            detail: 'Probable pero no seguro',
            icon: Target,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
        },
        {
            label: 'Pipeline (<50%)',
            value: formatCOPShort(totalPipeline),
            detail: 'Requiere trabajo comercial',
            icon: Layers,
            color: 'text-slate-500',
            bg: 'bg-slate-50',
        },
        {
            label: 'Win Rate',
            value: `${dashboardStats.winRate.toFixed(1)}%`,
            detail: `${dashboardStats.closedWonCount} ganadas de ${dashboardStats.totalLeads} leads`,
            icon: Percent,
            color: 'text-violet-600',
            bg: 'bg-violet-50',
        },
    ];

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <VisualReportHeader
                title="Forecast Comercial"
                subtitle="Proyeccion de cierres basada en probabilidad ponderada del pipeline"
                tenant={tenant}
            />

            {/* ── KPIs ────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                {kpis.map((kpi) => (
                    <div
                        key={kpi.label}
                        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-3"
                    >
                        <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', kpi.bg, kpi.color)}>
                            <kpi.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                            <p className="text-sm font-bold text-slate-900 font-mono tabular-nums truncate">{kpi.value}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5 truncate">{kpi.detail}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Chart: Forecast vs Facturado ────────────────────────────── */}
            <ForecastChart forecastData={forecastByMonth} actualData={monthlySales} />

            {/* ── Forecast por Comercial ──────────────────────────────────── */}
            <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <CardHeader className="border-b border-slate-100 px-5 py-3">
                    <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-slate-400" />
                        <CardTitle className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Forecast por Comercial ({assigneeRows.length})
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {assigneeRows.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                Sin datos — Asigna oportunidades a tu equipo
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full" role="table">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/60">
                                        <th scope="col" className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Comercial</th>
                                        <th scope="col" className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Opps</th>
                                        <th scope="col" className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Nominal</th>
                                        <th scope="col" className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Commit</th>
                                        <th scope="col" className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Best Case</th>
                                        <th scope="col" className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pipeline</th>
                                        <th scope="col" className="px-5 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Ponderado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {assigneeRows.map((row: AssigneeRow, i: number) => (
                                        <tr key={row.user_id ?? `unassigned-${i}`} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-5 py-4">
                                                <span className="text-xs font-bold text-slate-900">{row.full_name}</span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <span className="text-xs font-bold text-slate-500 font-mono">{row.opp_count}</span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <span className="text-xs text-slate-400 font-mono tabular-nums">{formatCOP(Number(row.nominal))}</span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <span className="text-xs font-bold text-emerald-600 font-mono tabular-nums">{formatCOPShort(Number(row.commit_val))}</span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <span className="text-xs font-bold text-amber-600 font-mono tabular-nums">{formatCOPShort(Number(row.best_case))}</span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <span className="text-xs text-slate-400 font-mono tabular-nums">{formatCOPShort(Number(row.pipeline_val))}</span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <span className="text-sm font-bold text-indigo-600 font-mono tabular-nums">{formatCOP(Number(row.weighted))}</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Totals row */}
                                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                                        <td className="px-5 py-3">
                                            <span className="text-xs font-black text-slate-900 uppercase">Total</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-xs font-black text-slate-900 font-mono">
                                                {assigneeTotalOpps}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-xs font-bold text-slate-500 font-mono tabular-nums">
                                                {formatCOP(assigneeTotalNominal)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-xs font-bold text-emerald-600 font-mono tabular-nums">
                                                {formatCOPShort(assigneeTotalCommit)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-xs font-bold text-amber-600 font-mono tabular-nums">
                                                {formatCOPShort(assigneeTotalBestCase)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-xs text-slate-400 font-mono tabular-nums">
                                                {formatCOPShort(assigneeTotalPipeline)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <span className="text-sm font-black text-indigo-600 font-mono tabular-nums">
                                                {formatCOP(assigneeTotalWeighted)}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Proximos Cierres ────────────────────────────────────────── */}
            <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <CardHeader className="border-b border-slate-100 px-5 py-3">
                    <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <CardTitle className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Proximos Cierres ({closesRows.length})
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {closesRows.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                Sin cierres proximos — Registra fechas de cierre en tus oportunidades
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full" role="table">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/60">
                                        <th scope="col" className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Oportunidad</th>
                                        <th scope="col" className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cliente</th>
                                        <th scope="col" className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Etapa</th>
                                        <th scope="col" className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Valor</th>
                                        <th scope="col" className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Prob.</th>
                                        <th scope="col" className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ponderado</th>
                                        <th scope="col" className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cierre</th>
                                        <th scope="col" className="px-5 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ver</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {closesRows.map((opp: UpcomingClose) => {
                                        const weighted = (Number(opp.value) || 0) * ((Number(opp.probability) || 0) / 100);
                                        const stageStyle = STAGE_COLORS[opp.stage] ?? 'bg-slate-50 text-slate-500';
                                        return (
                                            <tr key={opp.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-5 py-4">
                                                    <span className="text-xs font-bold text-slate-900 leading-snug">{opp.name}</span>
                                                </td>
                                                <td className="px-4 py-4 max-w-[160px]">
                                                    <span className="text-xs text-slate-500 truncate block">
                                                        {opp.parties?.legal_name ?? 'Sin cliente'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold', stageStyle)}>
                                                        {STAGE_LABELS[opp.stage] ?? opp.stage}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <span className="text-xs font-bold text-slate-900 font-mono tabular-nums">
                                                        {formatCOPShort(Number(opp.value))}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <span className={cn(
                                                        'text-xs font-bold font-mono tabular-nums',
                                                        opp.probability >= 90 ? 'text-emerald-600' :
                                                        opp.probability >= 50 ? 'text-amber-600' : 'text-slate-400'
                                                    )}>
                                                        {opp.probability}%
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <span className="text-xs font-bold text-indigo-600 font-mono tabular-nums">
                                                        {formatCOPShort(weighted)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <span className="text-[10px] font-semibold text-slate-500">
                                                        {formatDate(opp.expected_close_date)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <Link
                                                        href={`/crm/opportunities/${opp.id}`}
                                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wide"
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── CTA ─────────────────────────────────────────────────────── */}
            <div className="flex justify-center pt-4">
                <Link
                    href="/crm/pipeline"
                    className="inline-flex items-center gap-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-widest transition-colors"
                >
                    Ver Pipeline Completo <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>
        </div>
    );
}
