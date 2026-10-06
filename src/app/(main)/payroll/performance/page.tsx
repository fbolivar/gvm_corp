import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { settingsService } from '@/features/settings/services/settingsService';
import { canEvaluate, partyName } from '@/features/performance/services/performanceService';
import { ProbationCreateForm } from '@/features/performance/components/ProbationCreateForm';
import { OUTCOME_LABEL, PROBATION_DAYS } from '@/features/performance/types';
import { annualCampaignWindow } from '@/features/performance/utils/dates';
import { AnnualCampaignPanel } from '@/features/performance/components/AnnualCampaignPanel';
import { getEvaluatorOptions } from '@/features/performance/services/evaluatorOptions';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { bogotaDateString } from '@/features/payroll/utils/bogotaTime';
import { Button } from '@/shared/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const metadata = { title: 'Evaluación de desempeño — GVM Corp' };

type EvaluationRow = {
    id: string;
    status: string;
    due_date: string;
    probation_outcome: string | null;
    employee: { party: { legal_name: string } | { legal_name: string }[] | null } | { party: { legal_name: string } | { legal_name: string }[] | null }[] | null;
};

const STATUS_CLASS: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700',
    IN_PROGRESS: 'bg-blue-50 text-blue-700',
    CLOSED: 'bg-emerald-50 text-emerald-700',
};

export default async function PerformancePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) redirect('/login');

    const canCreate = await canEvaluate(supabase, tenant.id as string, user.id);

    const { data: evaluationRows } = await supabase
        .from('performance_evaluations')
        .select('id, status, due_date, probation_outcome, employee:employees(party:parties(legal_name))')
        .eq('eval_type', 'PROBATION')
        .order('due_date', { ascending: true });
    const evaluations = (evaluationRows ?? []) as unknown as EvaluationRow[];

    const { data: activeEmployees } = await supabase
        .from('employees')
        .select('id, start_date, party:parties(legal_name)')
        .eq('status', 'ACTIVE');

    const { data: openProbation } = await supabase
        .from('performance_evaluations')
        .select('employee_id')
        .eq('eval_type', 'PROBATION')
        .neq('status', 'CLOSED');
    const blockedIds = new Set((openProbation ?? []).map(r => r.employee_id as string));

    const employeeOptions = (activeEmployees ?? [])
        .filter(e => !blockedIds.has(e.id as string))
        .map(e => ({
            id: e.id as string,
            name: partyName(e.party as unknown as { legal_name: string } | null),
            startDate: e.start_date as string,
        }));

    const evaluatorOptions = canCreate ? await getEvaluatorOptions(tenant.id as string) : [];

    const today = bogotaDateString();

    const { data: campaignRow } = await supabase
        .from('performance_campaigns')
        .select('id, name, opens_on, closes_on')
        .eq('status', 'OPEN')
        .maybeSingle();
    const openCampaign = campaignRow
        ? { id: campaignRow.id as string, name: campaignRow.name as string, opensOn: campaignRow.opens_on as string, closesOn: campaignRow.closes_on as string }
        : null;

    type AnnualRow = {
        id: string;
        status: string;
        final_score: number | null;
        employee: { party: { legal_name: string } | { legal_name: string }[] | null } | { party: { legal_name: string } | { legal_name: string }[] | null }[] | null;
    };
    const annualRows = openCampaign
        ? ((await supabase
            .from('performance_evaluations')
            .select('id, status, final_score, employee:employees(party:parties(legal_name))')
            .eq('campaign_id', openCampaign.id)).data ?? []) as unknown as AnnualRow[]
        : [];
    const annualIds = annualRows.map(r => r.id);
    const { data: annualEvaluators } = annualIds.length
        ? await supabase.from('performance_evaluators').select('evaluation_id, status').in('evaluation_id', annualIds)
        : { data: [] as { evaluation_id: string; status: string }[] };
    const { data: recommendationRows } = canCreate && annualIds.length
        ? await supabase.from('performance_salary_recommendations').select('evaluation_id, pct').in('evaluation_id', annualIds)
        : { data: [] as { evaluation_id: string; pct: number }[] };
    const recommendationById = new Map((recommendationRows ?? []).map(r => [r.evaluation_id as string, Number(r.pct)]));
    const evaluatorStats = new Map<string, { total: number; done: number }>();
    for (const ev of annualEvaluators ?? []) {
        const s = evaluatorStats.get(ev.evaluation_id as string) ?? { total: 0, done: 0 };
        s.total += 1;
        if (ev.status === 'DONE') s.done += 1;
        evaluatorStats.set(ev.evaluation_id as string, s);
    }
    const windowDefaults = annualCampaignWindow(new Date().getUTCFullYear());

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl">
                    <Link href="/payroll"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1">
                    <VisualReportHeader
                        title="Evaluación de desempeño"
                        subtitle={`Período de prueba (${PROBATION_DAYS} días)`}
                        tenant={tenant}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-4">
                    <AnnualCampaignPanel
                        openCampaign={openCampaign}
                        defaultWindow={windowDefaults}
                        defaultName={`Evaluación anual ${new Date().getUTCFullYear()}`}
                        canManage={canCreate}
                    />
                </div>
                <div className="col-span-12 lg:col-span-8">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="text-left px-4 py-3">Empleado (anual)</th>
                                    <th className="text-left px-4 py-3">Evaluadores</th>
                                    <th className="text-left px-4 py-3">Estado</th>
                                    <th className="text-left px-4 py-3">Final</th>
                                    <th className="text-left px-4 py-3">Recomendación</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {annualRows.length === 0 && (
                                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Sin evaluaciones anuales en la campaña abierta</td></tr>
                                )}
                                {annualRows.map(r => {
                                    const emp = Array.isArray(r.employee) ? r.employee[0] : r.employee;
                                    const st = evaluatorStats.get(r.id) ?? { total: 0, done: 0 };
                                    return (
                                        <tr key={r.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <Link href={`/payroll/performance/${r.id}`} className="font-medium text-slate-900 hover:underline">
                                                    {partyName(emp?.party ?? null)}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 tabular-nums">{st.done}/{st.total}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_CLASS[r.status] ?? ''}`}>
                                                    {r.status === 'CLOSED' ? 'Cerrada' : r.status === 'IN_PROGRESS' ? 'En curso' : 'Pendiente'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-mono tabular-nums">{r.final_score !== null ? `${Number(r.final_score).toFixed(2)} / 5` : '—'}</td>
                                            <td className="px-4 py-3 font-mono tabular-nums">{recommendationById.has(r.id) ? `${recommendationById.get(r.id)}%` : '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {canCreate && (
                    <div className="col-span-12 lg:col-span-4">
                        <ProbationCreateForm employees={employeeOptions} evaluators={evaluatorOptions} />
                    </div>
                )}
                <div className={canCreate ? 'col-span-12 lg:col-span-8' : 'col-span-12'}>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="text-left px-4 py-3">Empleado</th>
                                    <th className="text-left px-4 py-3">Vence</th>
                                    <th className="text-left px-4 py-3">Estado</th>
                                    <th className="text-left px-4 py-3">Resultado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {evaluations.length === 0 && (
                                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Sin evaluaciones de período de prueba</td></tr>
                                )}
                                {evaluations.map(ev => {
                                    const emp = Array.isArray(ev.employee) ? ev.employee[0] : ev.employee;
                                    const overdue = ev.status !== 'CLOSED' && ev.due_date < today;
                                    return (
                                        <tr key={ev.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <Link href={`/payroll/performance/${ev.id}`} className="font-medium text-slate-900 hover:underline">
                                                    {partyName(emp?.party ?? null)}
                                                </Link>
                                            </td>
                                            <td className={`px-4 py-3 font-mono tabular-nums ${overdue ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>
                                                {ev.due_date}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_CLASS[ev.status] ?? ''}`}>
                                                    {ev.status === 'CLOSED' ? 'Cerrada' : ev.status === 'IN_PROGRESS' ? 'En curso' : 'Pendiente'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">
                                                {ev.probation_outcome ? OUTCOME_LABEL[ev.probation_outcome] : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
