import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { payrollService, PAYROLL_CONSTANTS } from '@/features/payroll/services/payrollService';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
    Users,
    TrendingUp,
    TrendingDown,
    Wallet,
    ArrowRight,
    BadgeInfo,
    Calendar,
    ShieldCheck,
} from "lucide-react"
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import Link from 'next/link';

const PERIOD_OPTIONS = [
    { label: 'Ene', month: 1 }, { label: 'Feb', month: 2 }, { label: 'Mar', month: 3 },
    { label: 'Abr', month: 4 }, { label: 'May', month: 5 }, { label: 'Jun', month: 6 },
    { label: 'Jul', month: 7 }, { label: 'Ago', month: 8 }, { label: 'Sep', month: 9 },
    { label: 'Oct', month: 10 }, { label: 'Nov', month: 11 }, { label: 'Dic', month: 12 },
];

export default async function PayrollSummaryPage({
    searchParams
}: {
    searchParams: Promise<{ month?: string; year?: string }>
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const now = new Date();
    const year  = parseInt(params.year  ?? String(now.getFullYear()), 10);
    const month = parseInt(params.month ?? String(now.getMonth() + 1), 10);

    const tenant = await settingsService.getTenantInfo(supabase);

    // Fetch active employees with party
    const { data: employees, error } = await supabase
        .from('employees')
        .select('*, party:parties(legal_name, doc_number, doc_type)')
        .eq('status', 'ACTIVE')
        .order('created_at');
    if (error) throw error;

    const emps = employees ?? [];

    // Fetch active loans and benefits for all employees in one pass
    const empIds = emps.map(e => e.id);
    const [{ data: loans }, { data: benefits }, { data: overtime }] = await Promise.all([
        supabase.from('payroll_loans').select('*').in('employee_id', empIds).eq('status', 'ACTIVE'),
        supabase.from('payroll_benefits').select('*').in('employee_id', empIds).eq('status', 'ACTIVE'),
        supabase.from('overtime_requests')
            .select('employee_id, hours')
            .in('employee_id', empIds)
            .eq('status', 'APPROVED')
            .gte('date', `${year}-${String(month).padStart(2, '0')}-01`)
            .lte('date', `${year}-${String(month).padStart(2, '0')}-31`),
    ]);

    // Build per-employee overtime map
    const overtimeMap: Record<string, number> = {};
    for (const ot of (overtime ?? [])) {
        overtimeMap[ot.employee_id] = (overtimeMap[ot.employee_id] ?? 0) + Number(ot.hours);
    }

    // Calculate settlements
    const rows = emps.map(emp => {
        const empLoans    = (loans ?? []).filter(l => l.employee_id === emp.id);
        const empBenefits = (benefits ?? []).filter(b => b.employee_id === emp.id);
        const otHours     = overtimeMap[emp.id] ?? 0;
        const settlement  = payrollService.calculateSettlement(
            emp as any, 30,
            empLoans as any,
            empBenefits as any,
            otHours > 0 ? { overtime: otHours, night: 0, sunday: 0 } : undefined
        );
        return { emp, settlement };
    });

    // KPIs
    const totalEarnings   = rows.reduce((s, r) => s + r.settlement.total_earnings, 0);
    const totalDeductions = rows.reduce((s, r) => s + r.settlement.total_deductions, 0);
    const totalNet        = rows.reduce((s, r) => s + r.settlement.net_pay, 0);
    const totalSS         = rows.reduce((s, r) => s + (r.settlement.social_security?.employer.total ?? 0), 0);
    const totalParafiscal = rows.reduce((s, r) => s + (r.settlement.social_security?.parafiscales.total ?? 0), 0);

    const fmt = (n: number) =>
        `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    const periodLabel = `${PERIOD_OPTIONS[month - 1].label} ${year}`;

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            <VisualReportHeader
                title="Resumen de Nómina"
                subtitle={`Periodo: ${periodLabel} · ${emps.length} empleados activos`}
                tenant={tenant}
            />

            {/* Period Selector */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">
                        Total a Pagar
                    </span>
                    <div className="flex items-baseline gap-4">
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                            {fmt(totalNet)}
                        </h2>
                        <span className="text-xl font-black text-slate-300 uppercase italic tracking-widest">
                            {emps.length} emp.
                        </span>
                    </div>
                </div>

                {/* Month tabs */}
                <div className="flex flex-wrap gap-1 bg-slate-100 p-1.5 rounded-2xl">
                    {PERIOD_OPTIONS.map(p => (
                        <Link
                            key={p.month}
                            href={`?month=${p.month}&year=${year}`}
                            className={cn(
                                "px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                month === p.month
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            {p.label}
                        </Link>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Devengado</p>
                            <p className="text-xl font-black text-emerald-600 italic tracking-tighter">{fmt(totalEarnings)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                            <TrendingDown className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Deducciones</p>
                            <p className="text-xl font-black text-rose-500 italic tracking-tighter">{fmt(totalDeductions)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">SS Patronal</p>
                            <p className="text-xl font-black text-indigo-600 italic tracking-tighter">{fmt(totalSS)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                            <BadgeInfo className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Parafiscales</p>
                            <p className="text-xl font-black text-amber-600 italic tracking-tighter">{fmt(totalParafiscal)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-active bg-slate-900 rounded-[2.5rem] p-8 text-white">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
                            <Wallet className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Neto a Pagar</p>
                            <p className="text-xl font-black text-white italic tracking-tighter">{fmt(totalNet)}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Payroll Table */}
            <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
                <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">
                            Liquidación por Empleado
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            Periodo {periodLabel} · Nómina Ordinaria
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-300" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{emps.length} empleados</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-50">
                                <th className="px-8 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Empleado</th>
                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Salario Base</th>
                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Devengado</th>
                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">SS Empleado</th>
                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Otras Ded.</th>
                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Neto a Pagar</th>
                                <th className="px-8 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Contrato</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {rows.map(({ emp, settlement }) => {
                                const ssEmployee = settlement.social_security?.employee.total ?? 0;
                                const otherDed   = settlement.total_deductions - ssEmployee;
                                const party = emp.party as any;

                                return (
                                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center text-white text-xs font-black shrink-0 group-hover:bg-indigo-600 transition-colors">
                                                    {(party?.legal_name ?? 'E').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-900 italic tracking-tight">{party?.legal_name ?? '—'}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{party?.doc_number ?? ''}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-xs font-bold text-slate-600 tabular-nums">{fmt(emp.salary)}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-xs font-black text-emerald-600 tabular-nums italic">{fmt(settlement.total_earnings)}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-xs font-bold text-rose-500 tabular-nums">{fmt(ssEmployee)}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-xs font-bold text-slate-400 tabular-nums">{otherDed > 0 ? fmt(otherDed) : '—'}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-sm font-black text-slate-900 tabular-nums italic">{fmt(settlement.net_pay)}</span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <Badge className="border-none bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-[0.15em] px-2.5 py-0.5 rounded-md">
                                                {emp.contract_type}
                                            </Badge>
                                        </td>
                                    </tr>
                                );
                            })}

                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-10 py-20 text-center">
                                        <Users className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                                            No hay empleados activos
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer totals */}
                {rows.length > 0 && (
                    <div className="px-10 py-6 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {rows.length} empleado{rows.length !== 1 ? 's' : ''} · Periodo {periodLabel}
                        </span>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Devengado</span>
                                <span className="text-sm font-black text-emerald-600 italic">{fmt(totalEarnings)}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block">Deducciones</span>
                                <span className="text-sm font-black text-rose-500 italic">{fmt(totalDeductions)}</span>
                            </div>
                            <div className="text-right border-l border-slate-200 pl-6">
                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block">Neto Total</span>
                                <span className="text-lg font-black text-slate-900 italic">{fmt(totalNet)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* PILA Banner */}
            <div className="bg-slate-100 p-10 rounded-[2.5rem] flex flex-col lg:flex-row items-center justify-between gap-10 border border-slate-200">
                <div className="flex items-center gap-8">
                    <div className="h-20 w-20 bg-white rounded-[2rem] flex items-center justify-center text-violet-600 shadow-premium border border-white">
                        <ShieldCheck className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-2xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                            Obligación PILA
                        </h4>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium max-w-xl">
                            Además del neto a pagar de{' '}
                            <span className="font-black text-slate-900">{fmt(totalNet)}</span>,{' '}
                            <span className="text-violet-600 font-bold">{tenant?.name}</span> debe aportar{' '}
                            <span className="font-black text-slate-900">{fmt(totalSS + totalParafiscal)}</span> adicionales
                            en aportes patronales y parafiscales. Costo nómina total:{' '}
                            <span className="font-black text-slate-900">{fmt(totalNet + totalSS + totalParafiscal)}</span>.
                        </p>
                    </div>
                </div>
                <Button variant="outline" className="h-16 rounded-[2rem] border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest px-12 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-premium group shrink-0">
                    Exportar Nómina <ArrowRight className="ml-4 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    );
}
