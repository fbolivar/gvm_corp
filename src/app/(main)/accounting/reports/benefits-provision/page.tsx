import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { payrollService, PAYROLL_CONSTANTS } from '@/features/payroll/services/payrollService';
import { Card } from "@/shared/components/ui/card"
import {
    Calculator,
    ArrowRight,
    PiggyBank,
    Calendar,
    Banknote,
    Umbrella,
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

export default async function BenefitsProvisionPage({
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
    if (error) throw error;

    const emps = employees ?? [];
    const empIds = emps.map(e => e.id);

    const { data: benefits } = await supabase
        .from('payroll_benefits')
        .select('*')
        .in('employee_id', empIds)
        .eq('status', 'ACTIVE');

    const rows = emps.map(emp => {
        const salary = Number(emp.salary);
        const empBenefits = (benefits ?? []).filter((b: any) => b.employee_id === emp.id);
        const transportAmt = emp.transport_allowance && salary <= PAYROLL_CONSTANTS.SMLV_2026 * 2
            ? PAYROLL_CONSTANTS.TRANSPORT_ALLOWANCE_2026 : 0;
        const salaryBenefits = empBenefits
            .filter((b: any) => b.is_salary && b.frequency === 'MONTHLY')
            .reduce((s: number, b: any) => s + Number(b.amount), 0);
        const ibc = salary + salaryBenefits;
        const provisions = payrollService.calculateProvisions(salary, transportAmt, ibc);
        // Acumulado año (mes actual × provisión mensual)
        const yearAccum = provisions.total * month;
        return { emp, provisions, yearAccum, salary };
    });

    const totCesantias  = rows.reduce((s, r) => s + r.provisions.cesantias, 0);
    const totIntereses  = rows.reduce((s, r) => s + r.provisions.intereses_cesantias, 0);
    const totPrima      = rows.reduce((s, r) => s + r.provisions.prima, 0);
    const totVacaciones = rows.reduce((s, r) => s + r.provisions.vacaciones, 0);
    const totMonth      = rows.reduce((s, r) => s + r.provisions.total, 0);
    const totYear       = rows.reduce((s, r) => s + r.yearAccum, 0);

    const fmt = (n: number) =>
        `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            <VisualReportHeader
                title="Provisiones de Prestaciones"
                subtitle={`Cesantías · Prima · Vacaciones · Periodo ${periodLabel}`}
                tenant={tenant}
            />

            {/* KPI Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">
                        Provisión Mensual Total
                    </span>
                    <div className="flex items-baseline gap-4">
                        <h2 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none">
                            {fmt(totMonth)}
                        </h2>
                        <span className="text-xl font-black text-fuchsia-400 uppercase italic tracking-widest">
                            {fmt(totYear)} acum. {year}
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

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {[
                    { label: 'Cesantías', value: totCesantias, icon: PiggyBank, color: 'text-violet-600', bg: 'bg-violet-50', rate: '8.33%' },
                    { label: 'Int. Cesantías', value: totIntereses, icon: Banknote, color: 'text-indigo-600', bg: 'bg-indigo-50', rate: '12% anual' },
                    { label: 'Prima de Servicios', value: totPrima, icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50', rate: '8.33%' },
                    { label: 'Vacaciones', value: totVacaciones, icon: Umbrella, color: 'text-sky-600', bg: 'bg-sky-50', rate: '4.17%' },
                ].map(item => (
                    <Card key={item.label} className="border-none shadow-premium bg-white rounded-[2.5rem] p-8">
                        <div className="space-y-4">
                            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", item.bg, item.color)}>
                                <item.icon className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{item.label}</p>
                                <p className={cn("text-xl font-black italic tracking-tighter", item.color)}>{fmt(item.value)}</p>
                                <p className="text-[9px] text-slate-300 font-bold mt-0.5">Tasa: {item.rate}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Detail Table */}
            <Card className="border-none shadow-premium bg-white rounded-[3rem] overflow-hidden">
                <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">Provisión por Empleado</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            Acumulado hasta {periodLabel}
                        </p>
                    </div>
                    <Calculator className="h-5 w-5 text-slate-300" />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-50">
                                <th className="px-8 py-5 text-left   text-[9px] font-black text-slate-400 uppercase tracking-widest">Empleado</th>
                                <th className="px-8 py-5 text-right  text-[9px] font-black text-slate-400 uppercase tracking-widest">Salario</th>
                                <th className="px-8 py-5 text-right  text-[9px] font-black text-slate-400 uppercase tracking-widest">Cesantías</th>
                                <th className="px-8 py-5 text-right  text-[9px] font-black text-slate-400 uppercase tracking-widest">Int. Ces.</th>
                                <th className="px-8 py-5 text-right  text-[9px] font-black text-slate-400 uppercase tracking-widest">Prima</th>
                                <th className="px-8 py-5 text-right  text-[9px] font-black text-slate-400 uppercase tracking-widest">Vacaciones</th>
                                <th className="px-8 py-5 text-right  text-[9px] font-black text-slate-400 uppercase tracking-widest">Mes</th>
                                <th className="px-8 py-5 text-right  text-[9px] font-black text-slate-400 uppercase tracking-widest">Acum. {year}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {rows.map(({ emp, provisions, yearAccum, salary }) => {
                                const party = emp.party as any;
                                return (
                                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center text-white text-xs font-black shrink-0 group-hover:bg-fuchsia-600 transition-colors">
                                                    {(party?.legal_name ?? 'E').charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-900 italic">{party?.legal_name ?? '—'}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{emp.contract_type}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right"><span className="text-xs font-bold text-slate-600 tabular-nums">{fmt(salary)}</span></td>
                                        <td className="px-8 py-5 text-right"><span className="text-xs font-bold text-violet-600 tabular-nums">{fmt(provisions.cesantias)}</span></td>
                                        <td className="px-8 py-5 text-right"><span className="text-xs font-bold text-indigo-600 tabular-nums">{fmt(provisions.intereses_cesantias)}</span></td>
                                        <td className="px-8 py-5 text-right"><span className="text-xs font-bold text-emerald-600 tabular-nums">{fmt(provisions.prima)}</span></td>
                                        <td className="px-8 py-5 text-right"><span className="text-xs font-bold text-sky-600 tabular-nums">{fmt(provisions.vacaciones)}</span></td>
                                        <td className="px-8 py-5 text-right"><span className="text-sm font-black text-slate-900 tabular-nums italic">{fmt(provisions.total)}</span></td>
                                        <td className="px-8 py-5 text-right"><span className="text-sm font-black text-fuchsia-600 tabular-nums italic">{fmt(yearAccum)}</span></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {rows.length > 0 && (
                    <div className="px-10 py-6 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {rows.length} empleados · Provisión mensual
                        </span>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <span className="text-[9px] font-black text-violet-500 uppercase tracking-widest block">Mes</span>
                                <span className="text-sm font-black text-violet-600 italic">{fmt(totMonth)}</span>
                            </div>
                            <div className="text-right border-l border-slate-200 pl-6">
                                <span className="text-[9px] font-black text-fuchsia-500 uppercase tracking-widest block">Acum. {year}</span>
                                <span className="text-lg font-black text-slate-900 italic">{fmt(totYear)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            <div className="bg-slate-100 p-12 rounded-[4rem] flex flex-col lg:flex-row items-center justify-between gap-10 border border-slate-200">
                <div className="flex items-center gap-8">
                    <div className="h-20 w-20 bg-white rounded-[2rem] flex items-center justify-center text-fuchsia-600 shadow-premium border border-white">
                        <PiggyBank className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-2xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                            Pasivo Contingente
                        </h4>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium max-w-xl">
                            <span className="text-fuchsia-600 font-bold">{tenant?.name}</span> acumula un pasivo de prestaciones de{' '}
                            <span className="font-black text-slate-900">{fmt(totYear)}</span> al {periodLabel}.
                            Cesantías e intereses deben consignarse al Fondo antes del 15 de febrero del año siguiente.
                        </p>
                    </div>
                </div>
                <Button variant="outline" className="h-16 rounded-[2rem] border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest px-12 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-premium group shrink-0">
                    Proyección Anual <ArrowRight className="ml-4 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    );
}
