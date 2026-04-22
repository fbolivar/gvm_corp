import { createClient } from '@/lib/supabase/server';
import { employeeService } from '@/features/payroll/services/employeeService';
import { payrollService } from '@/features/payroll/services/payrollService';
import { attendanceService } from '@/features/payroll/services/attendanceService';
import { settingsService } from '@/features/settings/services/settingsService';
import { TableExportClient } from '@/features/accounting/components/TableExportClient';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { PayrollSummaryTable } from '@/features/payroll/components/PayrollSummaryTable';
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

    // Auto-fetch attendance summaries for the period
    const attendanceSummaries = await Promise.all(
        activeEmployees.map(async emp => {
            try {
                const summary = await attendanceService.getPeriodSummary(supabase, emp.id!, periodStart, periodEnd);
                return { empId: emp.id!, summary };
            } catch {
                return { empId: emp.id!, summary: { overtime: 0, night: 0, sunday: 0, daysPresent: 0, totalWorkedHours: 0 } };
            }
        })
    );
    const attendanceByEmp: Record<string, { overtime: number; night: number; sunday: number; daysPresent: number; totalWorkedHours: number }> = {};
    attendanceSummaries.forEach(a => { attendanceByEmp[a.empId] = a.summary; });

    const rows = activeEmployees.map(emp => {
        const attSummary = attendanceByEmp[emp.id!];
        const hasAttendance = attSummary && (attSummary.overtime > 0 || attSummary.night > 0 || attSummary.sunday > 0);
        const settlement = payrollService.calculateSettlement(
            emp, 30,
            loansByEmp[emp.id!] ?? [],
            benefitsByEmp[emp.id!] ?? [],
            hasAttendance ? attSummary : undefined,
        );
        const party = emp.party as { legal_name?: string; doc_number?: string } | undefined;
        const companyCost = (settlement.social_security?.employer.total ?? 0)
            + (settlement.social_security?.parafiscales.total ?? 0)
            + (settlement.provisions?.total ?? 0);
        return { emp, settlement, party, companyCost, attSummary, hasAttendance };
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
        'Horas Trabajadas': r.attSummary?.totalWorkedHours ?? 0,
        'Horas Extra': r.attSummary?.overtime ?? 0,
        'Horas Nocturnas': r.attSummary?.night ?? 0,
        'Horas Dominicales': r.attSummary?.sunday ?? 0,
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

            {/* Consolidated Table (client: con buscador reactivo) */}
            <PayrollSummaryTable
                rows={rows}
                periodLabel={periodLabel}
                totalEarnings={totalEarnings}
                totalDeductions={totalDeductions}
                totalNetPay={totalNetPay}
                totalCostEmp={totalCostEmp}
                totalCost={totalCost}
                activeCount={activeEmployees.length}
            />

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
