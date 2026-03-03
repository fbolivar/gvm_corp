import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { absenceService } from '@/features/payroll/services/absenceService';
import { settingsService } from '@/features/settings/services/settingsService';
import { AbsenceApprovalPanel } from '@/features/payroll/components/AbsenceApprovalPanel';
import { CalendarDays, CheckCircle2, XCircle, HourglassIcon, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';

export const metadata = { title: 'Vacaciones & Ausencias — GVM Corp' };

export default async function AbsencesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) redirect('/login');

    const [pendingRequests, allRequests] = await Promise.all([
        absenceService.getPendingRequests(supabase, tenant.id).catch(() => []),
        absenceService.getAllRequests(supabase, tenant.id).catch(() => []),
    ]);

    const approvedCount = allRequests.filter(r => r.status === 'APPROVED').length;
    const rejectedCount = allRequests.filter(r => r.status === 'REJECTED').length;
    const totalDaysApproved = allRequests
        .filter(r => r.status === 'APPROVED')
        .reduce((s, r) => s + (r.days ?? 0), 0);

    return (
        <div className="page-container space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header */}
            <div className="relative overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                    <CalendarDays className="h-24 w-24 text-white" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-8 bg-amber-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-amber-400">Nómina · RRHH</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
                            Vacaciones<br /><span className="text-slate-500">& Ausencias</span>
                        </h1>
                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">
                            Aprobar solicitudes, historial y métricas
                        </p>
                    </div>
                    <Button variant="outline" className="h-12 px-6 rounded-2xl border-white/10 text-slate-300 hover:bg-white/10 font-black text-[10px] uppercase tracking-widest shrink-0" asChild>
                        <Link href="/payroll"><ArrowLeft className="h-4 w-4 mr-2" />Nómina</Link>
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    { label: 'Pendientes',      value: pendingRequests.length, icon: HourglassIcon, color: 'text-amber-600',   bg: 'bg-amber-50' },
                    { label: 'Aprobadas',        value: approvedCount,          icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Rechazadas',       value: rejectedCount,          icon: XCircle,       color: 'text-rose-600',    bg: 'bg-rose-50' },
                    { label: 'Días Aprobados',   value: `${totalDaysApproved}d`, icon: CalendarDays,  color: 'text-slate-600',   bg: 'bg-slate-50' },
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

            {/* Panel de aprobación */}
            <AbsenceApprovalPanel
                pendingRequests={pendingRequests}
                allRequests={allRequests}
            />
        </div>
    );
}
