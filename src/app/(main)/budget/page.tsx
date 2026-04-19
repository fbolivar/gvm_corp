import { createClient } from '@/lib/supabase/server';
import { budgetService } from '@/features/budget/services/budgetService';
import { createBudget } from '@/features/budget/actions';
import { PageHeader } from '@/shared/components/ui/page-header';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { StatusBadge, StatusTone } from '@/shared/components/ui/status-badge';
import { Button } from '@/shared/components/ui/button';
import {
    BarChart3,
    Plus,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    Target,
    Calendar,
} from "lucide-react";
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils";
import Link from 'next/link';

const STATUS_LABEL: Record<string, { label: string; tone: StatusTone }> = {
    DRAFT: { label: 'Borrador', tone: 'draft' },
    APPROVED: { label: 'Aprobado', tone: 'success' },
    CLOSED: { label: 'Cerrado', tone: 'danger' },
};

export default async function BudgetPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: ut } = await supabase.from('user_tenants').select('tenant_id').eq('user_id', user.id).single();
    const tenantId = ut?.tenant_id as string | undefined;

    const budgets = tenantId ? await budgetService.listBudgets(supabase, tenantId) : [];

    const fmt = (n: number) =>
        `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    const currentYear = new Date().getFullYear();
    const activeBudget = budgets.find(b => b.year === currentYear && b.status === 'APPROVED');

    return (
        <div className="page-container">
            <PageHeader
                title="Presupuesto"
                description="Planeación financiera anual, trimestral y mensual con control de ejecución."
                icon={Target}
                breadcrumbs={[
                    { label: 'Inicio', href: '/dashboard' },
                    { label: 'Contabilidad' },
                    { label: 'Presupuesto' },
                ]}
                meta={
                    activeBudget && (
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-emerald-50 border border-emerald-200/60 rounded-lg">
                            <span className="text-xs font-medium text-emerald-700">Activo {currentYear}:</span>
                            <span className="text-sm font-semibold text-slate-900">{activeBudget.name}</span>
                            <span className="text-xs text-slate-500">·</span>
                            <span className="text-xs text-slate-600">{fmt(activeBudget.total_income - activeBudget.total_expense)} utilidad planeada</span>
                        </div>
                    )
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Create form */}
                <aside className="lg:col-span-4">
                    <div className="surface-card p-6 lg:sticky lg:top-6">
                        <h2 className="text-h3 mb-4">Nuevo presupuesto</h2>
                        <form action={createBudget} className="space-y-4">
                            <div>
                                <label htmlFor="budget-name" className="block text-xs font-medium text-slate-700 mb-1.5">Nombre</label>
                                <input
                                    id="budget-name"
                                    type="text"
                                    name="name"
                                    required
                                    placeholder={`Presupuesto ${currentYear + 1}`}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="budget-year" className="block text-xs font-medium text-slate-700 mb-1.5">Año</label>
                                    <input
                                        id="budget-year"
                                        type="number"
                                        name="year"
                                        required
                                        defaultValue={currentYear + 1}
                                        min={2024}
                                        max={2030}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="budget-period" className="block text-xs font-medium text-slate-700 mb-1.5">Periodo</label>
                                    <select
                                        id="budget-period"
                                        name="period_type"
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                                    >
                                        <option value="ANNUAL">Anual</option>
                                        <option value="QUARTERLY">Trimestral</option>
                                        <option value="MONTHLY">Mensual</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="budget-desc" className="block text-xs font-medium text-slate-700 mb-1.5">Descripción (opcional)</label>
                                <textarea
                                    id="budget-desc"
                                    name="description"
                                    rows={2}
                                    placeholder="Proyecciones para..."
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                <Plus className="h-4 w-4 mr-1.5" />
                                Crear presupuesto
                            </Button>
                        </form>
                    </div>
                </aside>

                {/* List */}
                <div className="lg:col-span-8 space-y-4">
                    {budgets.length === 0 ? (
                        <div className="surface-card">
                            <EmptyState
                                icon={BarChart3}
                                title="Sin presupuestos"
                                description="Crea tu primer presupuesto usando el formulario a la izquierda."
                            />
                        </div>
                    ) : (
                        budgets.map(budget => {
                            const cfg = STATUS_LABEL[budget.status] ?? STATUS_LABEL.DRAFT;
                            const netPlan = budget.total_income - budget.total_expense;
                            const margin = budget.total_income > 0 ? ((netPlan / budget.total_income) * 100).toFixed(1) : '0';

                            return (
                                <Link key={budget.id} href={`/budget/${budget.id}`} className="block group">
                                    <div className="surface-card p-5 hover:border-slate-300 hover:shadow-md transition-all">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                                                    <Calendar className="h-5 w-5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="text-h3 truncate">{budget.name}</h3>
                                                        <StatusBadge tone={cfg.tone} dot>
                                                            {cfg.label}
                                                        </StatusBadge>
                                                    </div>
                                                    <p className="text-caption mt-0.5">
                                                        {budget.year} · {budget.period_type}
                                                    </p>
                                                    {budget.description && (
                                                        <p className="text-sm text-slate-600 mt-1 line-clamp-1">{budget.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                                        </div>

                                        <div className="mt-4 grid grid-cols-3 gap-3">
                                            <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-3">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <TrendingUp className="h-3 w-3 text-emerald-600" />
                                                    <span className="text-[11px] font-medium text-emerald-700">Ingresos</span>
                                                </div>
                                                <p className="text-sm font-semibold text-slate-900 tabular-nums">{fmt(budget.total_income)}</p>
                                            </div>
                                            <div className="rounded-lg bg-rose-50/60 border border-rose-100 p-3">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <TrendingDown className="h-3 w-3 text-rose-600" />
                                                    <span className="text-[11px] font-medium text-rose-700">Gastos</span>
                                                </div>
                                                <p className="text-sm font-semibold text-slate-900 tabular-nums">{fmt(budget.total_expense)}</p>
                                            </div>
                                            <div className={cn(
                                                "rounded-lg p-3 border",
                                                netPlan >= 0 ? "bg-sky-50/60 border-sky-100" : "bg-amber-50/60 border-amber-100"
                                            )}>
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <Target className={cn("h-3 w-3", netPlan >= 0 ? "text-sky-600" : "text-amber-600")} />
                                                    <span className={cn("text-[11px] font-medium", netPlan >= 0 ? "text-sky-700" : "text-amber-700")}>Utilidad</span>
                                                </div>
                                                <p className="text-sm font-semibold text-slate-900 tabular-nums">
                                                    {fmt(netPlan)} <span className="text-[11px] text-slate-500 font-normal">({margin}%)</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
