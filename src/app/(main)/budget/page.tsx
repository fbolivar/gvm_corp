import { createClient } from '@/lib/supabase/server';
import { budgetService } from '@/features/budget/services/budgetService';
import { createBudget } from '@/features/budget/actions';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
    BarChart3,
    Plus,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    Target,
    Calendar,
    CheckCircle2,
    Clock,
    Lock,
} from "lucide-react"
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"
import Link from 'next/link';

const STATUS_CONFIG = {
    DRAFT:    { label: 'Borrador',  cls: 'bg-slate-100 text-slate-500',   icon: Clock },
    APPROVED: { label: 'Aprobado', cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
    CLOSED:   { label: 'Cerrado',  cls: 'bg-rose-50 text-rose-600',       icon: Lock },
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
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* Header */}
            <div className="bg-slate-900 rounded-[3.5rem] p-12 md:p-20 text-white shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none">
                    <Target className="h-80 w-80" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-10">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-12 bg-indigo-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">Control Financiero</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter italic uppercase leading-[0.85]">
                            Módulo de <br /><span className="text-slate-500">Presupuesto</span>
                        </h1>
                    </div>
                    {activeBudget && (
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 min-w-[240px]">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Activo {currentYear}</p>
                            <p className="text-2xl font-black italic text-white">{activeBudget.name}</p>
                            <div className="mt-4 space-y-1">
                                <div className="flex justify-between text-[9px] font-bold">
                                    <span className="text-emerald-400">Ingresos</span>
                                    <span className="text-white">{fmt(activeBudget.total_income)}</span>
                                </div>
                                <div className="flex justify-between text-[9px] font-bold">
                                    <span className="text-rose-400">Gastos</span>
                                    <span className="text-white">{fmt(activeBudget.total_expense)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* New budget form + list */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* Create Form */}
                <div className="lg:col-span-4">
                    <Card className="border-none shadow-premium bg-white rounded-[3rem] p-10 sticky top-10">
                        <h3 className="text-lg font-black text-slate-900 tracking-tight italic uppercase mb-8">
                            Nuevo Presupuesto
                        </h3>
                        <form action={createBudget} className="space-y-5">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nombre</label>
                                <input type="text" name="name" required placeholder={`Presupuesto ${currentYear + 1}`}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Año</label>
                                <input type="number" name="year" required defaultValue={currentYear + 1} min={2024} max={2030}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Periodo</label>
                                <select name="period_type"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="ANNUAL">Anual</option>
                                    <option value="QUARTERLY">Trimestral</option>
                                    <option value="MONTHLY">Mensual</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Descripción (opcional)</label>
                                <textarea name="description" rows={2} placeholder="Proyecciones para..."
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                            </div>
                            <button type="submit"
                                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">
                                <Plus className="h-4 w-4" /> Crear Presupuesto
                            </button>
                        </form>
                    </Card>
                </div>

                {/* Budget List */}
                <div className="lg:col-span-8 space-y-5">
                    {budgets.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                            <BarChart3 className="h-16 w-16 text-slate-200" />
                            <p className="text-lg font-black text-slate-400 uppercase tracking-widest">Sin presupuestos</p>
                            <p className="text-sm text-slate-300 font-medium">Crea tu primer presupuesto usando el formulario</p>
                        </div>
                    )}

                    {budgets.map(budget => {
                        const cfg      = STATUS_CONFIG[budget.status] ?? STATUS_CONFIG.DRAFT;
                        const netPlan  = budget.total_income - budget.total_expense;
                        const margin   = budget.total_income > 0 ? ((netPlan / budget.total_income) * 100).toFixed(1) : '0';

                        return (
                            <Link key={budget.id} href={`/budget/${budget.id}`}>
                                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] hover:shadow-active transition-all">
                                    <div className="flex items-start justify-between gap-6">
                                        <div className="flex items-start gap-5">
                                            <div className="h-14 w-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white group-hover:bg-indigo-600 transition-colors shrink-0">
                                                <Calendar className="h-7 w-7" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-base font-black text-slate-900 italic tracking-tight">{budget.name}</h3>
                                                    <Badge className={cn("border-none text-[8px] font-black uppercase tracking-[0.15em] px-2.5 py-0.5 rounded-lg", cfg.cls)}>
                                                        {cfg.label}
                                                    </Badge>
                                                </div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                    {budget.year} · {budget.period_type}
                                                </p>
                                                {budget.description && (
                                                    <p className="text-[10px] text-slate-400 font-medium">{budget.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-slate-200 group-hover:text-slate-900 group-hover:translate-x-1 transition-all mt-1 shrink-0" />
                                    </div>

                                    <div className="mt-6 grid grid-cols-3 gap-4">
                                        <div className="bg-emerald-50 rounded-2xl p-4">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Ingresos</span>
                                            </div>
                                            <p className="text-sm font-black text-emerald-700 italic">{fmt(budget.total_income)}</p>
                                        </div>
                                        <div className="bg-rose-50 rounded-2xl p-4">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                                                <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Gastos</span>
                                            </div>
                                            <p className="text-sm font-black text-rose-700 italic">{fmt(budget.total_expense)}</p>
                                        </div>
                                        <div className={cn(
                                            "rounded-2xl p-4",
                                            netPlan >= 0 ? "bg-indigo-50" : "bg-amber-50"
                                        )}>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Target className={cn("h-3.5 w-3.5", netPlan >= 0 ? "text-indigo-500" : "text-amber-500")} />
                                                <span className={cn("text-[9px] font-black uppercase tracking-widest", netPlan >= 0 ? "text-indigo-600" : "text-amber-600")}>Utilidad</span>
                                            </div>
                                            <p className={cn("text-sm font-black italic", netPlan >= 0 ? "text-indigo-700" : "text-amber-700")}>
                                                {fmt(netPlan)} <span className="text-[9px]">({margin}%)</span>
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
