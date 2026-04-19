import { createClient } from '@/lib/supabase/server';
import { budgetService } from '@/features/budget/services/budgetService';
import { BudgetLineForm } from '@/features/budget/components/BudgetLineForm';
import { deleteBudgetLine, updateBudgetStatus } from '@/features/budget/actions';
import { AuditTrail } from '@/shared/components/ui/audit-trail';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
    Target,
    TrendingUp,
    TrendingDown,
    ArrowLeft,
    Trash2,
    CheckCircle2,
    AlertTriangle,
    BarChart3,
    Plus,
} from "lucide-react"
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"
import Link from 'next/link';
import { Button } from "@/shared/components/ui/button"

const STATUS_CONFIG = {
    DRAFT:    { label: 'Borrador',  cls: 'bg-slate-100 text-slate-600' },
    APPROVED: { label: 'Aprobado', cls: 'bg-emerald-50 text-emerald-700' },
    CLOSED:   { label: 'Cerrado',  cls: 'bg-rose-50 text-rose-600' },
};

export default async function BudgetDetailPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: ut } = await supabase.from('user_tenants').select('tenant_id').eq('user_id', user.id).single();
    const tenantId = ut?.tenant_id as string;

    const { budget, lines } = await budgetService.getBudgetWithLines(supabase, id);
    if (!budget) redirect('/budget');

    // Get actual vs budget
    const actual = await budgetService.getActualVsBudget(supabase, tenantId, budget.year, lines);

    const fmt = (n: number) =>
        `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    const pct = (actual: number, budgeted: number) => {
        if (budgeted === 0) return 0;
        return Math.min(200, (actual / budgeted) * 100);
    };

    const incomeLines  = lines.filter(l => l.line_type === 'INCOME');
    const expenseLines = lines.filter(l => l.line_type === 'EXPENSE');
    const netBudget    = budget.total_income - budget.total_expense;
    const margin       = budget.total_income > 0 ? ((netBudget / budget.total_income) * 100).toFixed(1) : '0';

    const cfg = STATUS_CONFIG[budget.status] ?? STATUS_CONFIG.DRAFT;

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* Back + Header */}
            <div className="space-y-6">
                <Link href="/budget" className="inline-flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" /> Volver a Presupuestos
                </Link>

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">{budget.name}</h1>
                            <Badge className={cn("border-none text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-xl", cfg.cls)}>
                                {cfg.label}
                            </Badge>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {budget.year} · {budget.period_type} · {lines.length} líneas
                        </p>
                    </div>

                    {/* Status actions */}
                    <div className="flex items-center gap-3">
                        {budget.status === 'DRAFT' && (
                            <form action={async () => { 'use server'; await updateBudgetStatus(id, 'APPROVED'); }}>
                                <Button type="submit" className="h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest px-6">
                                    <CheckCircle2 className="h-4 w-4 mr-2" /> Aprobar
                                </Button>
                            </form>
                        )}
                        {budget.status === 'APPROVED' && (
                            <form action={async () => { 'use server'; await updateBudgetStatus(id, 'CLOSED'); }}>
                                <Button variant="outline" type="submit" className="h-11 rounded-2xl border-slate-200 text-[9px] font-black uppercase tracking-widest px-6">
                                    Cerrar Periodo
                                </Button>
                            </form>
                        )}
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ingresos Plan</p>
                            <p className="text-xl font-black text-emerald-600 italic">{fmt(budget.total_income)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                            <TrendingDown className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Gastos Plan</p>
                            <p className="text-xl font-black text-rose-500 italic">{fmt(budget.total_expense)}</p>
                        </div>
                    </div>
                </Card>

                <Card className={cn(
                    "border-none rounded-[2.5rem] p-8",
                    netBudget >= 0 ? "shadow-premium bg-white" : "bg-amber-50 shadow-sm"
                )}>
                    <div className="space-y-4">
                        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center",
                            netBudget >= 0 ? "bg-indigo-50 text-indigo-600" : "bg-amber-100 text-amber-600")}>
                            <Target className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Utilidad Esperada</p>
                            <p className={cn("text-xl font-black italic", netBudget >= 0 ? "text-indigo-600" : "text-amber-600")}>
                                {fmt(netBudget)}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-active bg-slate-900 rounded-[2.5rem] p-8 text-white">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
                            <BarChart3 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Margen Esperado</p>
                            <p className="text-xl font-black text-white italic">{margin}%</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main: Lines + Form */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* Add Line Form */}
                <div className="lg:col-span-4">
                    <Card className="border-none shadow-premium bg-white rounded-[3rem] p-8 sticky top-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                                <Plus className="h-5 w-5" />
                            </div>
                            <h3 className="text-base font-black text-slate-900 italic uppercase tracking-tight">Añadir Línea</h3>
                        </div>
                        <BudgetLineForm budgetId={id} tenantId={tenantId} />
                    </Card>
                </div>

                {/* Lines Table */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Income Lines */}
                    <Card className="border-none shadow-premium bg-white rounded-[3rem] overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                                <h3 className="text-base font-black text-slate-900 italic uppercase">Ingresos</h3>
                                <Badge className="bg-emerald-50 text-emerald-600 border-none text-[8px] font-black uppercase px-2 py-0.5">
                                    {incomeLines.length} líneas
                                </Badge>
                            </div>
                            <span className="text-sm font-black text-emerald-600 italic">{fmt(budget.total_income)}</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {incomeLines.map(line => {
                                const a = actual[line.category];
                                const execPct = a ? pct(a.actual, Number(line.amount)) : 0;
                                return (
                                    <div key={line.id} className="px-8 py-5 hover:bg-slate-50/50 transition-colors group">
                                        <div className="flex items-center justify-between mb-2">
                                            <div>
                                                <p className="text-sm font-black text-slate-800 italic">{line.category}</p>
                                                {line.subcategory && <p className="text-[9px] text-slate-400 font-bold">{line.subcategory}</p>}
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <span className="text-sm font-black text-emerald-600 italic">{fmt(Number(line.amount))}</span>
                                                </div>
                                                <form action={async () => { 'use server'; await deleteBudgetLine(line.id!, id); }}>
                                                    <button type="submit" className="h-8 w-8 rounded-xl bg-slate-50 hover:bg-rose-50 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </form>
                                            </div>
                                        </div>
                                        {/* Progress bar */}
                                        {a && (
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[9px] font-bold text-slate-400">
                                                    <span>Ejecutado: {fmt(a.actual)}</span>
                                                    <span className={cn(execPct >= 100 ? "text-emerald-600" : "text-amber-500")}>
                                                        {execPct.toFixed(0)}%
                                                    </span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={cn(
                                                        "h-full rounded-full transition-all",
                                                        execPct >= 100 ? "bg-emerald-500" : execPct >= 70 ? "bg-amber-400" : "bg-rose-400"
                                                    )} style={{ width: `${Math.min(100, execPct)}%` }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {incomeLines.length === 0 && (
                                <div className="px-8 py-10 text-center text-[10px] text-slate-300 font-black uppercase tracking-widest">
                                    Sin líneas de ingreso
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Expense Lines */}
                    <Card className="border-none shadow-premium bg-white rounded-[3rem] overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-3 w-3 rounded-full bg-rose-500" />
                                <h3 className="text-base font-black text-slate-900 italic uppercase">Gastos</h3>
                                <Badge className="bg-rose-50 text-rose-600 border-none text-[8px] font-black uppercase px-2 py-0.5">
                                    {expenseLines.length} líneas
                                </Badge>
                            </div>
                            <span className="text-sm font-black text-rose-500 italic">{fmt(budget.total_expense)}</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {expenseLines.map(line => {
                                const a = actual[line.category];
                                const execPct = a ? pct(a.actual, Number(line.amount)) : 0;
                                const isOver  = execPct > 100;
                                return (
                                    <div key={line.id} className={cn(
                                        "px-8 py-5 transition-colors group",
                                        isOver ? "bg-rose-50/30 hover:bg-rose-50/50" : "hover:bg-slate-50/50"
                                    )}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                {isOver && <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />}
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 italic">{line.category}</p>
                                                    {line.subcategory && <p className="text-[9px] text-slate-400 font-bold">{line.subcategory}</p>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm font-black text-rose-500 italic">{fmt(Number(line.amount))}</span>
                                                <form action={async () => { 'use server'; await deleteBudgetLine(line.id!, id); }}>
                                                    <button type="submit" className="h-8 w-8 rounded-xl bg-slate-50 hover:bg-rose-50 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </form>
                                            </div>
                                        </div>
                                        {a && (
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[9px] font-bold text-slate-400">
                                                    <span>Ejecutado: {fmt(a.actual)}</span>
                                                    <span className={cn(isOver ? "text-rose-600 font-black" : execPct >= 80 ? "text-amber-500" : "text-slate-400")}>
                                                        {execPct.toFixed(0)}% {isOver && '⚠ EXCEDIDO'}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={cn(
                                                        "h-full rounded-full transition-all",
                                                        isOver ? "bg-rose-500" : execPct >= 80 ? "bg-amber-400" : "bg-emerald-400"
                                                    )} style={{ width: `${Math.min(100, execPct)}%` }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {expenseLines.length === 0 && (
                                <div className="px-8 py-10 text-center text-[10px] text-slate-300 font-black uppercase tracking-widest">
                                    Sin líneas de gasto
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Historial de auditoría */}
            <div className="mt-4">
                <AuditTrail
                    client={supabase}
                    entity="budgets"
                    entityId={id}
                    childEntities={[{ table: 'budget_lines', fk: 'budget_id' }]}
                />
            </div>
        </div>
    );
}
