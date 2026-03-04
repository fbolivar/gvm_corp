import { createClient } from '@/lib/supabase/server';
import { treasuryService } from '@/features/treasury/services/treasuryService';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ArrowLeft, Calendar, CheckCircle, Clock, FileText, Landmark, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cn } from '@/shared/lib/utils';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function ReconcileHistoryPage({ params }: Props) {
    const { id: accountId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [accountRes, tenant, statementsRes] = await Promise.all([
        supabase
            .from('treasury_accounts')
            .select('id, name, bank_name, account_number, balance, type')
            .eq('id', accountId)
            .maybeSingle(),
        settingsService.getTenantInfo(supabase),
        supabase
            .from('bank_statements')
            .select('id, status, start_date, end_date, opening_balance, closing_balance, created_at, matched_count, unmatched_count')
            .eq('account_id', accountId)
            .order('created_at', { ascending: false })
            .limit(50),
    ]);

    const account = accountRes.data;
    if (!account) redirect('/treasury/reconcile');

    const statements = statementsRes.data ?? [];
    const completed = statements.filter(s => s.status === 'COMPLETED').length;
    const pending = statements.filter(s => s.status === 'DRAFT').length;

    const fmt = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 0 });

    return (
        <div className="page-container space-y-8 pb-20 animate-in fade-in duration-500">
            <VisualReportHeader
                title={`Historial — ${account.name}`}
                subtitle={`${account.bank_name || 'Entidad'} • ${account.account_number || ''}`}
                tenant={tenant}
            />

            {/* Navegacion */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs font-semibold gap-2" asChild>
                    <Link href="/treasury/reconcile">
                        <ArrowLeft className="h-3.5 w-3.5" /> Volver
                    </Link>
                </Button>
                <Button size="sm" className="h-9 rounded-xl text-xs font-semibold gap-2 bg-slate-900 hover:bg-slate-800" asChild>
                    <Link href={`/treasury/reconcile/${accountId}/new`}>
                        <FileText className="h-3.5 w-3.5" /> Nuevo Extracto
                    </Link>
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <FileText className="h-4 w-4 text-slate-500" />
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Extractos</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{statements.length}</p>
                </Card>
                <Card className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Completados</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">{completed}</p>
                </Card>
                <Card className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pendientes</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-600">{pending}</p>
                </Card>
            </div>

            {/* Lista de extractos */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900">Extractos Bancarios</h2>

                {statements.length === 0 ? (
                    <Card className="rounded-2xl bg-white border border-slate-100 shadow-sm">
                        <CardContent className="py-16 text-center">
                            <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
                                <Landmark className="h-7 w-7 text-slate-200" />
                            </div>
                            <p className="text-sm font-semibold text-slate-400">No hay extractos registrados para esta cuenta.</p>
                            <p className="text-xs text-slate-300 mt-1">Cargue un extracto para iniciar la conciliación.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {statements.map((s) => {
                            const isCompleted = s.status === 'COMPLETED';
                            const isDraft = s.status === 'DRAFT';
                            return (
                                <Card key={s.id} className="rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                    <CardContent className="p-5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                                    isCompleted ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                                )}>
                                                    {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                                                </div>
                                                <div className="space-y-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                        <p className="text-sm font-bold text-slate-900">
                                                            {s.start_date} — {s.end_date}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                                        <span>Apertura: <strong className="text-slate-600">${fmt(Number(s.opening_balance))}</strong></span>
                                                        <span>Cierre: <strong className="text-slate-600">${fmt(Number(s.closing_balance))}</strong></span>
                                                        {s.matched_count != null && (
                                                            <span>Cruzados: <strong className="text-emerald-600">{s.matched_count}</strong></span>
                                                        )}
                                                        {s.unmatched_count != null && s.unmatched_count > 0 && (
                                                            <span>Sin cruzar: <strong className="text-rose-500">{s.unmatched_count}</strong></span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <Badge variant="outline" className={cn(
                                                    "text-[9px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-lg",
                                                    isCompleted ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                                        "bg-amber-50 text-amber-600 border-amber-200"
                                                )}>
                                                    {isCompleted ? 'Completado' : 'Borrador'}
                                                </Badge>

                                                {isDraft && (
                                                    <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs font-semibold gap-1.5" asChild>
                                                        <Link href={`/treasury/reconcile/${accountId}/match/${s.id}`}>
                                                            Continuar <ArrowRight className="h-3 w-3" />
                                                        </Link>
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
