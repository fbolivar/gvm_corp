import { createClient } from '@/lib/supabase/server';
import { employeeService } from '@/features/payroll/services/employeeService';
import { payrollService } from '@/features/payroll/services/payrollService';
import { settingsService } from '@/features/settings/services/settingsService';
import { TableExportClient } from '@/features/accounting/components/TableExportClient';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
    Users, TrendingUp, Building2,
    ChevronLeft, ChevronRight, ArrowLeft,
    Banknote,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { PayrollLoan, PayrollBenefit } from '@/features/payroll/types';

const CONTRACT_LABEL: Record<string, string> = {
    INDEFINIDO: 'Indefinido',
    FIJO: 'Fijo',
    OBRA_LABOR: 'Obra-Labor',
    APRENDIZAJE: 'Aprendizaje',
    PRESTACION_SERVICIOS: 'Prestacion Servicios',
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

    const today = new Date();
    const defaultPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const period = params.period ?? defaultPeriod;
    const [year, month] = period.split('-').map(Number);

    const periodStart = `${period}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const periodEnd = `${period}-${String(lastDay).padStart(2, '0')}`;
    const periodLabel = new Date(year, month - 1, 1).toLocaleDateString('es-CO', {
        month: 'long', year: 'numeric'
    });

    const prevDate = new Date(year, month - 2, 1);
    const nextDate = new Date(year, month, 1);
    const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const nextPeriod = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

    const [employees, tenant] = await Promise.all([
        employeeService.getEmployees(supabase).catch(() => [] as Awaited<ReturnType<typeof employeeService.getEmployees>>),
        settingsService.getTenantInfo(supabase),
    ]);

    const activeEmployees = employees.filter(e => e.status === 'ACTIVE');
    const employeeIds = activeEmployees.map(e => e.id!).filter(Boolean);

    const [loansRes, benefitsRes] = await Promise.all([
        employeeIds.length > 0
            ? supabase.from('payroll_loans').select('*').in('employee_id', employeeIds).eq('status', 'ACTIVE')
            : Promise.resolve({ data: [] as PayrollLoan[], error: null }),
        employeeIds.length > 0
            ? supabase.from('payroll_benefits').select('*').in('employee_id', employeeIds).eq('status', 'ACTIVE')
            : Promise.resolve({ data: [] as PayrollBenefit[], error: null }),
    ]);

    const allLoans: PayrollLoan[] = (loansRes.data ?? []) as PayrollLoan[];
    const allBenefits: PayrollBenefit[] = (benefitsRes.data ?? []) as PayrollBenefit[];

    const loansByEmp: Record<string, PayrollLoan[]> = {};
    const benefitsByEmp: Record<string, PayrollBenefit[]> = {};
    allLoans.forEach(l => { (loansByEmp[l.employee_id] ??= []).push(l); });
    allBenefits.forEach(b => { (benefitsByEmp[b.employee_id] ??= []).push(b); });

    const rows = activeEmployees.map(emp => {
        const settlement = payrollService.calculateSettlement(
            emp, 30,
            loansByEmp[emp.id!] ?? [],
            benefitsByEmp[emp.id!] ?? [],
        );
        const party = emp.party as { legal_name?: string; doc_number?: string } | undefined;
        const companyCost = (settlement.social_security?.employer.total ?? 0)
            + (settlement.social_security?.parafiscales.total ?? 0)
            + (settlement.provisions?.total ?? 0);
        return { emp, settlement, party, companyCost };
    });

    const totalEarnings = rows.reduce((s, r) => s + r.settlement.total_earnings, 0);
    const totalDeductions = rows.reduce((s, r) => s + r.settlement.total_deductions, 0);
    const totalNetPay = rows.reduce((s, r) => s + r.settlement.net_pay, 0);
    const totalCostEmp = rows.reduce((s, r) => s + r.companyCost, 0);
    const totalCost = totalNetPay + totalCostEmp;

    const fmt = (n: number) =>
        `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    const exportRows = rows.map(r => ({
        'Empleado': r.party?.legal_name ?? '',
        'Doc. Identidad': r.party?.doc_number ?? '',
        'Contrato': CONTRACT_LABEL[r.emp.contract_type] ?? r.emp.contract_type,
        'Salario Base': r.settlement.salary_base,
        'Devengado': r.settlement.total_earnings,
        'Deducciones': r.settlement.total_deductions,
        'Neto a Pagar': r.settlement.net_pay,
        'Costo Empresa': r.companyCost,
        'Costo Total': r.settlement.net_pay + r.companyCost,
    }));

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">

            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl">
                    <Link href="/payroll"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1">
                    <VisualReportHeader
                        title="Nomina Consolidada"
                        subtitle={`Periodo: ${periodLabel} (${periodStart} — ${periodEnd})`}
                        tenant={tenant}
                    />
                </div>
            </div>

            {/* Period navigator + export */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Costo Total del Periodo</p>
                    <div className="flex items-baseline gap-3">
                        <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">{fmt(totalCost)}</span>
                        <span className="text-xs text-slate-400">{activeEmployees.length} empleados</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        <Link
                            href={`?period=${prevPeriod}`}
                            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-500 hover:text-slate-900"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                        <span className="px-3 py-1.5 text-xs font-semibold text-slate-700 capitalize">{periodLabel}</span>
                        <Link
                            href={`?period=${nextPeriod}`}
                            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-500 hover:text-slate-900"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Link>
                    </div>
                    <TableExportClient
                        rows={exportRows}
                        fileName={`nomina-consolidada-${period}`}
                        sheetName="Nomina Consolidada"
                    />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Empleados Activos', value: String(activeEmployees.length), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Total Devengado', value: fmt(totalEarnings), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Neto a Pagar', value: fmt(totalNetPay), icon: Banknote, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Costo Total Empresa', value: fmt(totalCost), icon: Building2, color: 'text-slate-600', bg: 'bg-slate-50' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-3">
                        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", kpi.bg, kpi.color)}>
                            <kpi.icon className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                            <p className="text-sm font-bold text-slate-900 font-mono tabular-nums">{kpi.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Consolidated Table */}
            <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Liquidacion Consolidada</h3>
                        <p className="text-xs text-slate-400">Devengados, Deducciones, Neto, Costo Empresa — {periodLabel}</p>
                    </div>
                    <span className="text-xs font-semibold text-indigo-600">{activeEmployees.length} empleados</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Empleado</th>
                                <th className="hidden lg:table-cell px-6 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Contrato</th>
                                <th className="hidden lg:table-cell px-6 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Salario Base</th>
                                <th className="px-6 py-3 text-right text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Devengado</th>
                                <th className="hidden md:table-cell px-6 py-3 text-right text-[10px] font-semibold text-rose-400 uppercase tracking-wider">Deducciones</th>
                                <th className="px-6 py-3 text-right text-[10px] font-semibold text-blue-500 uppercase tracking-wider">Neto</th>
                                <th className="hidden md:table-cell px-6 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Costo Empresa</th>
                                <th className="px-6 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Costo Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {rows.map(({ emp, settlement, party, companyCost }) => (
                                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-3">
                                        <p className="text-xs font-bold text-slate-900">{party?.legal_name ?? 'Sin nombre'}</p>
                                        <p className="text-[10px] text-slate-400">{party?.doc_number ?? '—'}</p>
                                    </td>
                                    <td className="hidden lg:table-cell px-6 py-3">
                                        <span className="text-[10px] font-semibold text-indigo-600">{CONTRACT_LABEL[emp.contract_type] ?? emp.contract_type}</span>
                                    </td>
                                    <td className="hidden lg:table-cell px-6 py-3 text-right">
                                        <span className="text-xs text-slate-500 tabular-nums font-mono">{fmt(settlement.salary_base)}</span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <span className="text-xs font-bold text-emerald-600 tabular-nums font-mono">{fmt(settlement.total_earnings)}</span>
                                    </td>
                                    <td className="hidden md:table-cell px-6 py-3 text-right">
                                        <span className="text-xs text-rose-500 tabular-nums font-mono">-{fmt(settlement.total_deductions)}</span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <span className="text-xs font-bold text-blue-600 tabular-nums font-mono">{fmt(settlement.net_pay)}</span>
                                    </td>
                                    <td className="hidden md:table-cell px-6 py-3 text-right">
                                        <span className="text-xs text-amber-600 tabular-nums font-mono">{fmt(companyCost)}</span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <span className="text-xs font-bold text-slate-900 tabular-nums font-mono">{fmt(settlement.net_pay + companyCost)}</span>
                                    </td>
                                </tr>
                            ))}

                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center">
                                        <Users className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                                        <p className="text-xs text-slate-400">No hay empleados activos</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>

                        {rows.length > 0 && (
                            <tfoot>
                                <tr className="bg-slate-50 border-t border-slate-200">
                                    <td className="px-6 py-3">
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Totales del Periodo</span>
                                    </td>
                                    <td className="hidden lg:table-cell px-6 py-3" colSpan={2} />
                                    <td className="px-6 py-3 text-right">
                                        <span className="text-xs font-bold text-emerald-600 tabular-nums font-mono">{fmt(totalEarnings)}</span>
                                    </td>
                                    <td className="hidden md:table-cell px-6 py-3 text-right">
                                        <span className="text-xs font-bold text-rose-500 tabular-nums font-mono">-{fmt(totalDeductions)}</span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <span className="text-xs font-bold text-blue-600 tabular-nums font-mono">{fmt(totalNetPay)}</span>
                                    </td>
                                    <td className="hidden md:table-cell px-6 py-3 text-right">
                                        <span className="text-xs font-bold text-amber-600 tabular-nums font-mono">{fmt(totalCostEmp)}</span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <span className="text-sm font-bold text-slate-900 tabular-nums font-mono">{fmt(totalCost)}</span>
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </Card>

            {/* Company cost breakdown */}
            <Card className="rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                    <div className="space-y-4 flex-1">
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Desglose Costo Empresa</p>
                            <h3 className="text-sm font-bold text-slate-900 capitalize">{periodLabel}</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Neto Empleados</p>
                                <p className="text-sm font-bold text-blue-600 font-mono tabular-nums">{fmt(totalNetPay)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Seg. Social Empleador</p>
                                <p className="text-sm font-bold text-amber-600 font-mono tabular-nums">
                                    {fmt(rows.reduce((s, r) => s + (r.settlement.social_security?.employer.total ?? 0), 0))}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Parafiscales</p>
                                <p className="text-sm font-bold text-fuchsia-600 font-mono tabular-nums">
                                    {fmt(rows.reduce((s, r) => s + (r.settlement.social_security?.parafiscales.total ?? 0), 0))}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Provisiones</p>
                                <p className="text-sm font-bold text-emerald-600 font-mono tabular-nums">
                                    {fmt(rows.reduce((s, r) => s + (r.settlement.provisions?.total ?? 0), 0))}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Costo Total Empresa</p>
                        <p className="text-xl font-bold text-slate-900 font-mono tabular-nums">{fmt(totalCost)}</p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
