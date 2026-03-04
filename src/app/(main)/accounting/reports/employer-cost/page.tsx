import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { payrollService, PAYROLL_CONSTANTS } from '@/features/payroll/services/payrollService';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
    Building2,
    ShieldCheck,
    Percent,
    ArrowRight,
    TrendingUp,
    AlertTriangle,
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

export default async function EmployerCostPage({
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
    const periodLabel = `${PERIOD_OPTIONS[month - 1].label} ${year}`;

    const tenant = await settingsService.getTenantInfo(supabase);

    const { data: employees, error } = await supabase
        .from('employees')
        .select('*, party:parties(legal_name, doc_number)')
        .eq('status', 'ACTIVE')
        .order('created_at');
    if (error) console.error('[employer-cost]', error.message);

    const emps = employees ?? [];
    const empIds = emps.map(e => e.id);

    const [{ data: benefits }] = await Promise.all([
        supabase.from('payroll_benefits').select('*').in('employee_id', empIds).eq('status', 'ACTIVE'),
    ]);

    const rows = emps.map(emp => {
        const empBenefits = (benefits ?? []).filter(b => b.employee_id === emp.id);
        const salary = Number(emp.salary);
        const transportAmt = emp.transport_allowance && salary <= PAYROLL_CONSTANTS.SMLV_2026 * 2
            ? PAYROLL_CONSTANTS.TRANSPORT_ALLOWANCE_2026
            : 0;
        const salaryBenefits = empBenefits
            .filter(b => b.is_salary && b.frequency === 'MONTHLY')
            .reduce((s: number, b: any) => s + Number(b.amount), 0);
        const ibc = salary + salaryBenefits;
        const ss = payrollService.calculateSocialSecuritySummary(salary, ibc, (emp.risk_level ?? '1') as any);
        const provisions = payrollService.calculateProvisions(salary, transportAmt, ibc);
        const totalMonthlyCost = salary + transportAmt + ss.employer.total + ss.parafiscales.total + provisions.total;
        return { emp, ss, provisions, transportAmt, salary, totalMonthlyCost };
    });

    // Aggregates
    const totalSalaries      = rows.reduce((s, r) => s + r.salary, 0);
    const totalHealth        = rows.reduce((s, r) => s + r.ss.employer.health, 0);
    const totalPension       = rows.reduce((s, r) => s + r.ss.employer.pension, 0);
    const totalArl           = rows.reduce((s, r) => s + r.ss.employer.arl, 0);
    const totalCcf           = rows.reduce((s, r) => s + r.ss.parafiscales.ccf, 0);
    const totalSena          = rows.reduce((s, r) => s + r.ss.parafiscales.sena, 0);
    const totalIcbf          = rows.reduce((s, r) => s + r.ss.parafiscales.icbf, 0);
    const totalProvisions    = rows.reduce((s, r) => s + r.provisions.total, 0);
    const totalMonthlyCost   = rows.reduce((s, r) => s + r.totalMonthlyCost, 0);
    const loadFactor         = totalSalaries > 0 ? ((totalMonthlyCost / totalSalaries - 1) * 100).toFixed(1) : '0';

    const fmt = (n: number) =>
        `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            <VisualReportHeader
                title="Costos de Empleador"
                subtitle={`Carga prestacional total · Periodo ${periodLabel}`}
                tenant={tenant}
            />

            {/* Header KPI */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">
                        Costo Total Empresa
                    </span>
                    <div className="flex items-baseline gap-4">
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                            {fmt(totalMonthlyCost)}
                        </h2>
                        <span className="text-xl font-black text-amber-500 uppercase italic tracking-widest">
                            +{loadFactor}% sobre salario
                        </span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-1 bg-slate-100 p-1.5 rounded-2xl">
                    {PERIOD_OPTIONS.map(p => (
                        <Link key={p.month} href={`?month=${p.month}&year=${year}`}
                            className={cn(
                                "px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                month === p.month ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}>
                            {p.label}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Breakdown Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {[
                    { label: 'Salud Patronal', value: totalHealth, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Pensión Patronal', value: totalPension, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'ARL', value: totalArl, color: 'text-rose-500', bg: 'bg-rose-50' },
                    { label: 'CCF + SENA + ICBF', value: totalCcf + totalSena + totalIcbf, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map(item => (
                    <Card key={item.label} className="border-none shadow-premium bg-white rounded-[2.5rem] p-8">
                        <div className="space-y-3">
                            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", item.bg, item.color)}>
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                                <p className={cn("text-xl font-black italic tracking-tighter", item.color)}>{fmt(item.value)}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Provisions summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {[
                    { label: 'Cesantías', value: rows.reduce((s, r) => s + r.provisions.cesantias, 0) },
                    { label: 'Int. Cesantías', value: rows.reduce((s, r) => s + r.provisions.intereses_cesantias, 0) },
                    { label: 'Prima', value: rows.reduce((s, r) => s + r.provisions.prima, 0) },
                    { label: 'Vacaciones', value: rows.reduce((s, r) => s + r.provisions.vacaciones, 0) },
                ].map(item => (
                    <Card key={item.label} className="border-none shadow-premium bg-white rounded-[2.5rem] p-7">
                        <div className="space-y-2">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Provisión {item.label}</p>
                            <p className="text-lg font-black text-fuchsia-600 italic">{fmt(item.value)}</p>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Detail Table */}
            <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
                <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">
                            Detalle por Empleado
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            SS Patronal + Parafiscales + Provisiones
                        </p>
                    </div>
                    <Building2 className="h-5 w-5 text-slate-300" />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-50">
                                <th className="px-8 py-5 text-left   text-[9px] font-black text-slate-400 uppercase tracking-widest">Empleado</th>
                                <th className="px-8 py-5 text-right  text-[9px] font-black text-slate-400 uppercase tracking-widest">Salario</th>
                                <th className="px-8 py-5 text-right  text-[9px] font-black text-slate-400 uppercase tracking-widest">SS Patronal</th>
                                <th className="px-8 py-5 text-right  text-[9px] font-black text-slate-400 uppercase tracking-widest">Parafiscales</th>
                                <th className="px-8 py-5 text-right  text-[9px] font-black text-slate-400 uppercase tracking-widest">Provisiones</th>
                                <th className="px-8 py-5 text-right  text-[9px] font-black text-slate-400 uppercase tracking-widest">Costo Total</th>
                                <th className="px-8 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Factor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {rows.map(({ emp, ss, provisions, salary, totalMonthlyCost: rowTotal }) => {
                                const party = emp.party as any;
                                const factor = salary > 0 ? ((rowTotal / salary - 1) * 100).toFixed(0) : '0';
                                return (
                                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center text-white text-xs font-black shrink-0 group-hover:bg-pink-600 transition-colors">
                                                    {(party?.legal_name ?? 'E').charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-900 italic">{party?.legal_name ?? '—'}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Nivel {emp.risk_level ?? '1'} ARL</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-xs font-bold text-slate-600 tabular-nums">{fmt(salary)}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-xs font-bold text-blue-600 tabular-nums">{fmt(ss.employer.total)}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-xs font-bold text-amber-600 tabular-nums">{fmt(ss.parafiscales.total)}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-xs font-bold text-fuchsia-600 tabular-nums">{fmt(provisions.total)}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-sm font-black text-slate-900 tabular-nums italic">{fmt(rowTotal)}</span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <Badge className="border-none bg-amber-50 text-amber-700 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                                                +{factor}%
                                            </Badge>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {rows.length > 0 && (
                    <div className="px-10 py-6 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {rows.length} empleados · Periodo {periodLabel}
                        </span>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block">SS + Parafiscal</span>
                                <span className="text-sm font-black text-blue-600 italic">{fmt(totalHealth + totalPension + totalArl + totalCcf + totalSena + totalIcbf)}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] font-black text-fuchsia-500 uppercase tracking-widest block">Provisiones</span>
                                <span className="text-sm font-black text-fuchsia-600 italic">{fmt(totalProvisions)}</span>
                            </div>
                            <div className="text-right border-l border-slate-200 pl-6">
                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block">Costo Total</span>
                                <span className="text-lg font-black text-slate-900 italic">{fmt(totalMonthlyCost)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            <div className="bg-slate-100 p-10 rounded-[2.5rem] flex flex-col lg:flex-row items-center justify-between gap-10 border border-slate-200">
                <div className="flex items-center gap-8">
                    <div className="h-14 w-14 bg-white rounded-[2rem] flex items-center justify-center text-pink-600 shadow-premium border border-white">
                        <AlertTriangle className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-2xl font-black tracking-tight uppercase leading-tight text-slate-900">
                            Factor Prestacional
                        </h4>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium max-w-xl">
                            Por cada $100 de salario pagado,{' '}
                            <span className="text-pink-600 font-bold">{tenant?.name}</span> incurre en{' '}
                            <span className="font-black text-slate-900">${loadFactor} adicionales</span> en obligaciones legales.
                            Factor de carga prestacional real: <span className="font-black text-slate-900">{(Number(loadFactor) + 100).toFixed(0)}%</span>.
                        </p>
                    </div>
                </div>
                <Button variant="outline" className="h-12 rounded-[2rem] border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest px-12 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-premium group shrink-0">
                    Exportar Análisis <ArrowRight className="ml-4 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    );
}
