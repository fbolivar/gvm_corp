import { createClient } from '@/lib/supabase/server';
import { budgetService } from '@/features/accounting/services/budgetService';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Plus, BarChart3, ArrowRight, CheckCircle, Clock, Lock } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cn } from '@/shared/lib/utils';

export default async function BudgetsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [budgets, tenant] = await Promise.all([
        budgetService.getAll(supabase),
        settingsService.getTenantInfo(supabase),
    ]);

    const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
        DRAFT:    { label: 'Borrador',  color: 'bg-slate-50 text-slate-600',     icon: Clock },
        APPROVED: { label: 'Aprobado',  color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle },
        CLOSED:   { label: 'Cerrado',   color: 'bg-rose-50 text-rose-600',       icon: Lock },
    };

    return (
        <div className="page-container space-y-8 pb-20 animate-in fade-in duration-500">

            <VisualReportHeader
                title="Presupuesto Anual"
                subtitle="Planificación financiera · Real vs. Presupuestado por mes"
                tenant={tenant}
            />

            {/* Action */}
            <div className="flex justify-end">
                <Button size="sm" asChild className="h-9 px-4 rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700">
                    <Link href="/accounting/budget/new">
                        <Plus className="h-3.5 w-3.5" />
                        <span className="text-xs">Nuevo Presupuesto</span>
                    </Link>
                </Button>
            </div>

            {/* LIST */}
            {budgets.length === 0 ? (
                <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                        <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
                            <BarChart3 className="h-7 w-7" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-700 mb-1">Sin Presupuestos</h3>
                        <p className="text-xs text-slate-400 mb-4">Cree su primer presupuesto anual para comenzar el control financiero</p>
                        <Button size="sm" asChild className="h-9 px-4 rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700">
                            <Link href="/accounting/budget/new">Crear Presupuesto</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {budgets.map(b => {
                        const si = STATUS_MAP[b.status];
                        const Icon = si.icon;
                        return (
                            <Link key={b.id} href={`/accounting/budget/${b.id}`} className="group block">
                                <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm hover:border-indigo-100 hover:shadow-md transition-all duration-300">
                                    <CardContent className="p-5">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                                <BarChart3 className="h-4 w-4" />
                                            </div>
                                            <Badge className={cn(
                                                "border-none text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5",
                                                si.color
                                            )}>
                                                <Icon className="h-3 w-3 mr-1 inline" />{si.label}
                                            </Badge>
                                        </div>
                                        <div className="space-y-1 mb-4">
                                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{b.name}</h3>
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Año fiscal {b.year}</p>
                                            {b.notes && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{b.notes}</p>}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] text-slate-300">{new Date(b.created_at).toLocaleDateString('es-CO')}</p>
                                            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
