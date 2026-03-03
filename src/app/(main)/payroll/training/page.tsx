import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { settingsService } from '@/features/settings/services/settingsService';
import { trainingService } from '@/features/training/services/trainingService';
import { ProgramForm } from '@/features/training/components/ProgramForm';
import { TrainingRecordForm } from '@/features/training/components/TrainingRecordForm';
import { TrainingRecordList } from '@/features/training/components/TrainingRecordList';
import {
    GraduationCap,
    BookOpen,
    CheckCircle2,
    BarChart3,
    ArrowLeft,
    CalendarDays,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';

export const metadata = { title: 'Capacitacion — GVM Corp' };

export default async function TrainingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) redirect('/login');

    const [programs, records, metrics, employeesRes] = await Promise.all([
        trainingService.getPrograms(supabase, tenant.id).catch(() => []),
        trainingService.getRecords(supabase, tenant.id).catch(() => []),
        trainingService.getMetrics(supabase, tenant.id).catch(() => ({
            totalPrograms: 0,
            totalRecords: 0,
            completedRecords: 0,
            failedRecords: 0,
            completionRate: 0,
        })),
        supabase
            .from('employees')
            .select('id, party:parties(legal_name)')
            .eq('status', 'ACTIVE'),
    ]);

    const scheduledCount = records.filter(r => r.status === 'SCHEDULED').length;

    type EmployeeRow = { id: string; party: { legal_name: string } | null };
    const employeeList = ((employeesRes.data ?? []) as unknown as EmployeeRow[]).map(emp => ({
        id: emp.id,
        name: emp.party?.legal_name ?? 'Sin nombre',
    }));

    return (
        <div className="page-container space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Hero Header */}
            <div className="relative overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                    <GraduationCap className="h-24 w-24 text-white" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-8 bg-indigo-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">
                                Nomina · RRHH
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
                            Capacitacion<br />
                            <span className="text-slate-500">&amp; Formacion</span>
                        </h1>
                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">
                            Programas, registros y seguimiento de formacion
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        className="h-12 px-6 rounded-2xl border-white/10 text-slate-300 hover:bg-white/10 font-black text-[10px] uppercase tracking-widest shrink-0"
                        asChild
                    >
                        <Link href="/payroll">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Nomina
                        </Link>
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    {
                        label: 'Total Programas',
                        value: metrics.totalPrograms,
                        icon: BookOpen,
                        color: 'text-indigo-600',
                        bg: 'bg-indigo-50',
                    },
                    {
                        label: 'Programadas',
                        value: scheduledCount,
                        icon: CalendarDays,
                        color: 'text-blue-600',
                        bg: 'bg-blue-50',
                    },
                    {
                        label: 'Completadas',
                        value: metrics.completedRecords,
                        icon: CheckCircle2,
                        color: 'text-emerald-600',
                        bg: 'bg-emerald-50',
                    },
                    {
                        label: 'Tasa Completitud',
                        value: `${metrics.completionRate}%`,
                        icon: BarChart3,
                        color: 'text-amber-600',
                        bg: 'bg-amber-50',
                    },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white rounded-[2.5rem] p-7 shadow-premium flex items-center gap-5">
                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${kpi.bg} ${kpi.color}`}>
                            <kpi.icon className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                            <p className="text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-12 gap-8">
                {/* Left: Forms */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <ProgramForm />
                    <TrainingRecordForm programs={programs} employees={employeeList} />
                </div>

                {/* Right: Record list */}
                <div className="col-span-12 lg:col-span-8">
                    <TrainingRecordList records={records} />
                </div>
            </div>
        </div>
    );
}
