import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { settingsService } from '@/features/settings/services/settingsService';
import { trainingService } from '@/features/training/services/trainingService';
import { ProgramForm } from '@/features/training/components/ProgramForm';
import { TrainingRecordForm } from '@/features/training/components/TrainingRecordForm';
import { TrainingRecordList } from '@/features/training/components/TrainingRecordList';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { BookOpen, CheckCircle2, BarChart3, ArrowLeft, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

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

    const kpis = [
        { label: 'Total Programas', value: metrics.totalPrograms, icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Programadas', value: scheduledCount, icon: CalendarDays, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Completadas', value: metrics.completedRecords, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Tasa Completitud', value: `${metrics.completionRate}%`, icon: BarChart3, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl">
                    <Link href="/payroll"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1">
                    <VisualReportHeader
                        title="Capacitacion y Formacion"
                        subtitle="Programas, registros y seguimiento de formacion"
                        tenant={tenant}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => (
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

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-4 space-y-4">
                    <ProgramForm />
                    <TrainingRecordForm programs={programs} employees={employeeList} />
                </div>
                <div className="col-span-12 lg:col-span-8">
                    <TrainingRecordList records={records} />
                </div>
            </div>
        </div>
    );
}
