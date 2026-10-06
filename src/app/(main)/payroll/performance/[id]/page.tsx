import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { partyName, canEvaluate } from '@/features/performance/services/performanceService';
import { getEvaluatorOptions } from '@/features/performance/services/evaluatorOptions';
import { ProbationEvaluationForm } from '@/features/performance/components/ProbationEvaluationForm';
import { AnnualEvaluatorsForm } from '@/features/performance/components/AnnualEvaluatorsForm';
import { OUTCOME_LABEL } from '@/features/performance/types';
import { settingsService } from '@/features/settings/services/settingsService';
import { Button } from '@/shared/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const metadata = { title: 'Evaluación de desempeño — GVM Corp' };

const KIND_ORDER: Record<string, number> = { COMPETENCY: 0, JOB_CONDITION: 1, OBJECTIVE: 2 };

export default async function PerformanceEvaluationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) redirect('/login');

    const { data: evaluation } = await supabase
        .from('performance_evaluations')
        .select('id, status, eval_type, due_date, role_id_snapshot, probation_outcome, outcome_comments, closed_at, final_score, employee:employees(party:parties(legal_name))')
        .eq('id', id)
        .maybeSingle();
    if (!evaluation || (evaluation.eval_type !== 'PROBATION' && evaluation.eval_type !== 'ANNUAL')) notFound();

    const isAnnual = evaluation.eval_type === 'ANNUAL';
    const employee = Array.isArray(evaluation.employee) ? evaluation.employee[0] : evaluation.employee;
    const employeeName = partyName(employee?.party ?? null);
    const snapshotRole = evaluation.role_id_snapshot as string | null;
    const isOpen = evaluation.status !== 'CLOSED';

    const { data: assignment } = await supabase
        .from('performance_evaluators')
        .select('id, status')
        .eq('evaluation_id', id)
        .eq('evaluator_id', user.id)
        .maybeSingle();

    const { data: criteriaRows } = await supabase
        .from('performance_criteria')
        .select('id, kind, criterion, role_id, sort_order')
        .eq('eval_type', evaluation.eval_type)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
    const criteria = (criteriaRows ?? [])
        .filter(c => c.role_id === null || c.role_id === snapshotRole)
        .map(c => ({ id: c.id as string, kind: c.kind as 'COMPETENCY' | 'JOB_CONDITION' | 'OBJECTIVE', criterion: c.criterion as string }))
        .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);

    const canAnswer = isOpen && assignment?.status === 'PENDING';
    const isManager = await canEvaluate(supabase, tenant.id as string, user.id);
    const { data: recommendation } = isAnnual && isManager
        ? await supabase.from('performance_salary_recommendations').select('pct').eq('evaluation_id', id).maybeSingle()
        : { data: null };

    let evaluators: { id: string; status: string; weight: number; name: string }[] = [];
    if (isAnnual) {
        const { data: rows } = await supabase
            .from('performance_evaluators')
            .select('evaluator_id, status, weight')
            .eq('evaluation_id', id);
        const names = new Map((await getEvaluatorOptions(tenant.id as string)).map(o => [o.id, o.name]));
        evaluators = (rows ?? []).map(r => ({
            id: r.evaluator_id as string,
            status: r.status as string,
            weight: Number(r.weight),
            name: names.get(r.evaluator_id as string) ?? 'Evaluador',
        }));
    }

    let results: { criterion: string; scores: number[] }[] = [];
    if (!isOpen) {
        const { data: answers } = await supabase
            .from('performance_answers')
            .select('criterion_id, score')
            .eq('evaluation_id', id);
        const byCriterion = new Map<string, number[]>();
        for (const a of answers ?? []) {
            const list = byCriterion.get(a.criterion_id as string) ?? [];
            list.push(a.score as number);
            byCriterion.set(a.criterion_id as string, list);
        }
        results = criteria
            .filter(c => byCriterion.has(c.id))
            .map(c => ({ criterion: c.criterion, scores: byCriterion.get(c.id) ?? [] }));
    }

    const showEvaluatorManagement = isAnnual && isManager && isOpen;
    const evaluatorOptions = showEvaluatorManagement
        ? (await getEvaluatorOptions(tenant.id as string)).filter(o => !evaluators.some(e => e.id === o.id))
        : [];

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500 max-w-3xl">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl">
                    <Link href="/payroll/performance"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div>
                    <h1 className="text-lg font-bold text-slate-900">{employeeName}</h1>
                    <p className="text-xs text-slate-500">
                        {isAnnual ? 'Evaluación anual' : 'Período de prueba'} · {isAnnual ? 'cierre' : 'vence el'} {evaluation.due_date}
                    </p>
                </div>
            </div>

            {isAnnual && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
                    <p className="text-sm font-bold text-slate-900">Evaluadores</p>
                    {evaluators.length === 0 && <p className="text-sm text-slate-500">Aún no hay evaluadores asignados.</p>}
                    {evaluators.map(e => (
                        <div key={e.id} className="flex items-center justify-between text-sm">
                            <span className="text-slate-800">{e.name} <span className="text-slate-400">· peso {e.weight}</span></span>
                            <span className={`text-xs font-semibold ${e.status === 'DONE' ? 'text-emerald-700' : 'text-amber-700'}`}>
                                {e.status === 'DONE' ? 'Calificó' : 'Pendiente'}
                            </span>
                        </div>
                    ))}
                    {showEvaluatorManagement && (
                        <div className="pt-3 border-t border-slate-100">
                            <AnnualEvaluatorsForm evaluationId={id} evaluators={evaluatorOptions} />
                        </div>
                    )}
                </div>
            )}

            {isOpen && !canAnswer && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
                    {assignment
                        ? 'Ya registraste tu calificación para esta evaluación.'
                        : 'No estás asignado como evaluador de esta evaluación.'}
                </div>
            )}

            {canAnswer && (
                <ProbationEvaluationForm evaluationId={id} criteria={criteria} evalKind={isAnnual ? 'ANNUAL' : 'PROBATION'} />
            )}

            {!isOpen && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Resultado</p>
                        {isAnnual ? (
                            <p className="text-base font-bold text-slate-900">
                                Calificación final: {evaluation.final_score !== null ? `${Number(evaluation.final_score).toFixed(2)} / 5` : '—'}
                            </p>
                        ) : (
                            <>
                                <p className="text-base font-bold text-slate-900">
                                    {evaluation.probation_outcome ? OUTCOME_LABEL[evaluation.probation_outcome] : '—'}
                                </p>
                                {evaluation.outcome_comments && (
                                    <p className="text-sm text-slate-600 whitespace-pre-line">{evaluation.outcome_comments}</p>
                                )}
                            </>
                        )}
                        <p className="text-xs text-slate-400">Cerrada el {evaluation.closed_at ? new Date(evaluation.closed_at).toLocaleDateString('es-CO') : '—'}</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100">
                        {results.map(r => {
                            const avg = r.scores.reduce((s, n) => s + n, 0) / r.scores.length;
                            return (
                                <div key={r.criterion} className="flex items-center justify-between gap-4 p-4">
                                    <p className="text-sm text-slate-800">{r.criterion}</p>
                                    <span className="font-mono tabular-nums text-sm font-semibold text-slate-900">{avg.toFixed(1)} / 5</span>
                                </div>
                            );
                        })}
                    </div>
                    {isAnnual && isManager && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Recomendación de incremento</p>
                            <p className="text-base font-bold text-slate-900">
                                {recommendation ? `${Number(recommendation.pct)}%` : '—'}
                            </p>
                            <p className="text-xs text-slate-500">Calculada por bandas según la calificación final. No modifica el salario.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
