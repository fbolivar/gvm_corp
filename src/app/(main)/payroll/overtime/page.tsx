import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { overtimeService } from '@/features/payroll/services/overtimeService';
import { settingsService } from '@/features/settings/services/settingsService';
import { OvertimeApprovalPanel } from '@/features/payroll/components/OvertimeApprovalPanel';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Clock, CheckCircle2, XCircle, HourglassIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

export const metadata = { title: 'Horas Extra — GVM Corp' };

export default async function OvertimePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) redirect('/login');

    const [pendingRequests, allRequests] = await Promise.all([
        overtimeService.getPendingRequests(supabase, tenant.id).catch(() => []),
        overtimeService.getAllRequests(supabase, tenant.id).catch(() => []),
    ]);

    const approvedCount = allRequests.filter(r => r.status === 'APPROVED').length;
    const rejectedCount = allRequests.filter(r => r.status === 'REJECTED').length;
    const totalHoursApproved = allRequests
        .filter(r => r.status === 'APPROVED')
        .reduce((s, r) => s + Number(r.hours), 0);

    const kpis = [
        { label: 'Pendientes', value: pendingRequests.length, icon: HourglassIcon, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Aprobadas', value: approvedCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Rechazadas', value: rejectedCount, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
        { label: 'Horas Aprobadas', value: `${totalHoursApproved}h`, icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50' },
    ];

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl">
                    <Link href="/payroll"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1">
                    <VisualReportHeader
                        title="Horas Extra"
                        subtitle="Aprobacion de solicitudes, historial y metricas"
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

            <OvertimeApprovalPanel
                pendingRequests={pendingRequests}
                allRequests={allRequests}
            />
        </div>
    );
}
