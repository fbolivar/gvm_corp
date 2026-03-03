import { createClient } from '@/lib/supabase/server';
import { employeeService } from '@/features/payroll/services/employeeService';
import { payrollService } from '@/features/payroll/services/payrollService';
import { settingsService } from '@/features/settings/services/settingsService';
import { TableExportClient } from '@/features/accounting/components/TableExportClient';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card } from '@/shared/components/ui/card';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
    Users, DollarSign, TrendingUp, Building2,
    ChevronLeft, ChevronRight, AlertTriangle,
    UserCheck, Banknote, Loader2,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { PayrollLoan, PayrollBenefit } from '@/features/payroll/types';

const CONTRACT_LABEL: Record<string, string> = {
    INDEFINIDO:             'Indefinido',
    FIJO:                   'Fijo',
    OBRA_LABOR:             'Obra-Labor',
    APRENDIZAJE:            'Aprendizaje',
    PRESTACION_SERVICIOS:   'Prestación Servicios',
};

export default async function PayrollSummaryPage({
    searchParams
}: {
    searchParams: Promise<{ period?: string }>
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Period: YYYY-MM, default = current month
    const today = new Date();
    const defaultPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const period = params.period ?? defaultPeriod;
    const [year, month] = period.split('-').map(Number);

    const periodStart = `${period}-01`;
    const lastDay     = new Date(year, month, 0).getDate();
    const periodEnd   = `${period}-${String(lastDay).padStart(2, '0')}`;
    const periodLabel = new Date(year, month - 1, 1).toLocaleDateString('es-CO', {
        month: 'long', year: 'numeric'
    });

    // Prev/Next navigation
    const prevDate   = new Date(year, month - 2, 1);
    const nextDate   = new Date(year, month, 1);
    const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const nextPeriod = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

    // Fetch employees + tenant info
    const [employees, tenant] = await Promise.all([
        employeeService.getEmployees(supabase).catch(() => [] as Awaited<ReturnType<typeof employeeService.getEmployees>>),
        settingsService.getTenantInfo(supabase),
    ]);

    const activeEmployees = employees.filter(e => e.status === 'ACTIVE');
    const employeeIds     = activeEmployees.map(e => e.id!).filter(Boolean);

    // Batch-fetch loans + benefits
    const [loansRes, benefitsRes] = await Promise.all([
        employeeIds.length > 0
            ? supabase.from('payroll_loans').select('*').in('employee_id', employeeIds).eq('status', 'ACTIVE')
            : Promise.resolve({ data: [] as PayrollLoan[], error: null }),
        employeeIds.length > 0
            ? supabase.from('payroll_benefits').select('*').in('employee_id', employeeIds).eq('status', 'ACTIVE')
            : Promise.resolve({ data: [] as PayrollBenefit[], error: null }),
    ]);

    const allLoans:    PayrollLoan[]    = (loansRes.data    ?? []) as PayrollLoan[];
    const allBenefits: PayrollBenefit[] = (benefitsRes.data ?? []) as PayrollBenefit[];

    // Group by employee_id
    const loansByEmp:    Record<string, PayrollLoan[]>    = {};
    const benefitsByEmp: Record<string, PayrollBenefit[]> = {};
    allLoans.forEach(l    => { (loansByEmp[l.employee_id]    ??= []).push(l); });
    allBenefits.forEach(b => { (benefitsByEmp[b.employee_id] ??= []).push(b); });

    // Calculate settlements
    const rows = activeEmployees.map(emp => {
        const settlement = payrollService.calculateSettlement(
            emp,
            30,
            loansByEmp[emp.id!]    ?? [],
            benefitsByEmp[emp.id!] ?? [],
        );
        const party       = emp.party as { legal_name?: string; doc_number?: string } | undefined;
        const companyCost = (settlement.social_security?.employer.total    ?? 0)
                          + (settlement.social_security?.parafiscales.total ?? 0)
                          + (settlement.provisions?.total                   ?? 0);
        return { emp, settlement, party, companyCost };
    });

    // KPIs
    const totalEarnings   = rows.reduce((s, r) => s + r.settlement.total_earnings,  0);
    const totalDeductions = rows.reduce((s, r) => s + r.settlement.total_deductions, 0);
    const totalNetPay     = rows.reduce((s, r) => s + r.settlement.net_pay,          0);
    const totalCostEmp    = rows.reduce((s, r) => s + r.companyCost,                 0);
    const totalCost       = totalNetPay + totalCostEmp;

    const fmt = (n: number) =>
        `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    const exportRows = rows.map(r => ({
        'Empleado':         r.party?.legal_name ?? '',
        'Doc. Identidad':   r.party?.doc_number ?? '',
        'Contrato':         CONTRACT_LABEL[r.emp.contract_type] ?? r.emp.contract_type,
        'Salario Base':     r.settlement.salary_base,
        'Devengado':        r.settlement.total_earnings,
        'Deducciones':      r.settlement.total_deductions,
        'Neto a Pagar':     r.settlement.net_pay,
        'Costo Empresa':    r.companyCost,
        'Costo Total':      r.settlement.net_pay + r.companyCost,
    }));

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            <VisualReportHeader
                title="Nómina Consolidada"
                subtitle={`Período: ${periodLabel} (${periodStart} — ${periodEnd})`}
                tenant={tenant}
            />

            {/* Period navigator + export */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">
                        Costo Total del Período
                    </span>
                    <div className="flex items-baseline gap-4">
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">
                            {fmt(totalCost)}
                        </h2>
                        <span className="text-xl font-black text-slate-300 uppercase italic tracking-widest">
                            {activeEmployees.length} empleados
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Month navigator */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl">
                        <Link
                            href={`?period=${prevPeriod}`}
                            className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-sm transition-all text-slate-500 hover:text-slate-900"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                        <span className="px-5 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 capitalize">
                            {periodLabel}
                        </span>
                        <Link
                            href={`?period=${nextPeriod}`}
                            className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-sm transition-all text-slate-500 hover:text-slate-900"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </div>
                    <TableExportClient
                        rows={exportRows}
                        fileName={`nomina-consolidada-${period}`}
                        sheetName="Nómina Consolidada"
                    />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Empleados Activos</p>
                            <p className="text-2xl font-black text-indigo-600 italic tracking-tighter">{activeEmployees.length}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Devengado</p>
                            <p className="text-2xl font-black text-emerald-600 italic tracking-tighter">{fmt(totalEarnings)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <Banknote className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Neto a Pagar</p>
                            <p className="text-2xl font-black text-blue-600 italic tracking-tighter">{fmt(totalNetPay)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-active bg-slate-900 rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all text-white">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Costo Total Empresa</p>
                            <p className="text-2xl font-black text-white italic tracking-tighter">{fmt(totalCost)}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Consolidated Table */}
            <Card className="border-none shadow-premium bg-white rounded-[3rem] overflow-hidden">
                <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">
                            Liquidación Consolidada
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            Devengados · Deducciones · Neto · Costo Empresa — {periodLabel}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-indigo-400" />
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                            {activeEmployees.length} empleados
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-50">
                                <th className="px-8 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Empleado</th>
                                <th className="px-8 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Contrato</th>
                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Salario Base</th>
                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest text-emerald-500">Devengado</th>
                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest text-rose-400">Deducciones</th>
                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest text-blue-500">Neto</th>
                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Costo Empresa</th>
                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Costo Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {rows.map(({ emp, settlement, party, companyCost }) => (
                                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                                    {/* Employee */}
                                    <td className="px-8 py-5">
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-black text-slate-900 italic tracking-tight uppercase">
                                                {party?.legal_name ?? 'Sin nombre'}
                                            </p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                                {party?.doc_number ?? '—'}
                                            </p>
                                        </div>
                                    </td>

                                    {/* Contract */}
                                    <td className="px-8 py-5">
                                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                                            {CONTRACT_LABEL[emp.contract_type] ?? emp.contract_type}
                                        </span>
                                    </td>

                                    {/* Base salary */}
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-xs font-bold text-slate-500 tabular-nums">
                                            {fmt(settlement.salary_base)}
                                        </span>
                                    </td>

                                    {/* Devengado */}
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-xs font-black text-emerald-600 tabular-nums italic">
                                            {fmt(settlement.total_earnings)}
                                        </span>
                                    </td>

                                    {/* Deducciones */}
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-xs font-bold text-rose-500 tabular-nums">
                                            -{fmt(settlement.total_deductions)}
                                        </span>
                                    </td>

                                    {/* Neto */}
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-sm font-black text-blue-600 tabular-nums italic">
                                            {fmt(settlement.net_pay)}
                                        </span>
                                    </td>

                                    {/* Company cost */}
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-xs font-bold text-amber-600 tabular-nums">
                                            {fmt(companyCost)}
                                        </span>
                                    </td>

                                    {/* Total cost */}
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-sm font-black text-slate-900 tabular-nums italic">
                                            {fmt(settlement.net_pay + companyCost)}
                                        </span>
                                    </td>
                                </tr>
                            ))}

                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-10 py-20 text-center">
                                        <Users className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                                            No hay empleados activos
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>

                        {/* Totals footer */}
                        {rows.length > 0 && (
                            <tfoot>
                                <tr className="bg-slate-900 text-white">
                                    <td className="px-8 py-5" colSpan={3}>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/60">
                                            TOTALES DEL PERÍODO
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-sm font-black text-emerald-400 tabular-nums italic">
                                            {fmt(totalEarnings)}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-sm font-black text-rose-400 tabular-nums">
                                            -{fmt(totalDeductions)}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-sm font-black text-blue-400 tabular-nums italic">
                                            {fmt(totalNetPay)}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-sm font-black text-amber-400 tabular-nums">
                                            {fmt(totalCostEmp)}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-lg font-black text-white tabular-nums italic">
                                            {fmt(totalCost)}
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </Card>

            {/* Company cost breakdown banner */}
            <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white flex flex-col lg:flex-row items-start justify-between gap-12 shadow-active relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-[0.04] pointer-events-none">
                    <Building2 className="h-20 w-20" />
                </div>
                <div className="relative z-10 space-y-6 flex-1">
                    <div>
                        <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2">Desglose Costo Empresa</p>
                        <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white leading-none">
                            {periodLabel}
                        </h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold mb-1">Neto Empleados</p>
                            <p className="text-lg font-black text-blue-400 italic">{fmt(totalNetPay)}</p>
                        </div>
                        <div>
                            <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold mb-1">Seg. Social Empleador</p>
                            <p className="text-lg font-black text-amber-400 italic">
                                {fmt(rows.reduce((s, r) => s + (r.settlement.social_security?.employer.total ?? 0), 0))}
                            </p>
                        </div>
                        <div>
                            <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold mb-1">Parafiscales</p>
                            <p className="text-lg font-black text-fuchsia-400 italic">
                                {fmt(rows.reduce((s, r) => s + (r.settlement.social_security?.parafiscales.total ?? 0), 0))}
                            </p>
                        </div>
                        <div>
                            <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold mb-1">Provisiones</p>
                            <p className="text-lg font-black text-emerald-400 italic">
                                {fmt(rows.reduce((s, r) => s + (r.settlement.provisions?.total ?? 0), 0))}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="relative z-10 text-right shrink-0">
                    <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold mb-2">Costo Total Empresa</p>
                    <p className="text-3xl font-black text-white tracking-tight">{fmt(totalCost)}</p>
                </div>
            </div>
        </div>
    );
}
