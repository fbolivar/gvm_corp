import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { partyName } from '@/features/performance/services/performanceService';
import { ProbationEvaluationForm } from '@/features/performance/components/ProbationEvaluationForm';
import { OUTCOME_LABEL } from '@/features/performance/types';
import { Button } from '@/shared/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const metadata = { title: 'Evaluación de desempeño — GVM Corp' };

export default async function PerformanceEvaluationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: evaluation } = await supabase
        .from('performance_evaluations')
        .select('id, status, eval_type, due_date, role_id_snapshot, probation_outcome, outcome_comments, closed_at, employee:employees(party:parties(legal_name))')
        .eq('id', id)
        .maybeSingle();
    if (!evaluation || evaluation.eval_type !== 'PROBATION') notFound();

    const employee = Array.isArray(evaluation.employee) ? evaluation.employee[0] : evaluation.employee;
    const employeeName = partyName(employee?.party ?? null);
    const snapshotRole = evaluation.role_id_snapshot as string | null;

    const { data: assignment } = await supabase
        .from('performance_evaluators')
        .select('id, status')
        .eq('evaluation_id', id)
        .eq('evaluator_id', user.id)
        .maybeSingle();

    const { data: criteriaRows } = await supabase
        .from('performance_criteria')
        .select('id, kind, criterion, role_id, sort_order')
        .eq('eval_type', 'PROBATION')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
    const criteria = (criteriaRows ?? [])
        .filter(c => c.role_id === null || c.role_id === snapshotRole)
        .map(c => ({ id: c.id as string, kind: c.kind as 'COMPETENCY' | 'JOB_CONDITION', criterion: c.criterion as string }))
        .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'COMPETENCY' ? -1 : 1));

    const isOpen = evaluation.status !== 'CLOSED';
    const canAnswer = isOpen && assignment?.status === 'PENDING';

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

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500 max-w-3xl">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl">
                    <Link href="/payroll/performance"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div>
                    <h1 className="text-lg font-bold text-slate-900">{employeeName}</h1>
                    <p className="text-xs text-slate-500">Período de prueba · vence el {evaluation.due_date}</p>
                </div>
            </div>

            {isOpen && !canAnswer && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
                    {assignment
                        ? 'Ya registraste tu calificación para esta evaluación.'
                        : 'No estás asignado como evaluador de esta evaluación.'}
                </div>
            )}

            {canAnswer && (
                <ProbationEvaluationForm evaluationId={id} criteria={criteria} />
            )}

            {!isOpen && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Resultado</p>
                        <p className="text-base font-bold text-slate-900">
                            {evaluation.probation_outcome ? OUTCOME_LABEL[evaluation.probation_outcome] : '—'}
                        </p>
                        {evaluation.outcome_comments && (
                            <p className="text-sm text-slate-600 whitespace-pre-line">{evaluation.outcome_comments}</p>
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
                </div>
            )}
        </div>
    );
}
