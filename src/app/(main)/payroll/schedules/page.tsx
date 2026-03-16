import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { settingsService } from "@/features/settings/services/settingsService"
import { scheduleService } from "@/features/payroll/services/scheduleService"
import { VisualReportHeader } from "@/features/accounting/components/VisualReportHeader"
import { ScheduleForm } from "@/features/payroll/components/ScheduleForm"
import { ScheduleList } from "@/features/payroll/components/ScheduleList"
import { ScheduleAssignment } from "@/features/payroll/components/ScheduleAssignment"
import { Button } from "@/shared/components/ui/button"
import Link from "next/link"
import { ArrowLeft, CalendarClock, Users } from "lucide-react"

export default async function SchedulesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const tenant = await settingsService.getTenantInfo(supabase)
    if (!tenant) redirect('/login')

    const [schedules, assignments] = await Promise.all([
        scheduleService.getSchedules(supabase).catch(() => []),
        scheduleService.getScheduleAssignments(supabase).catch(() => []),
    ])

    // Count employees per schedule
    const assignmentCounts: Record<string, number> = {}
    assignments.forEach(a => {
        if (a.schedule_id) {
            assignmentCounts[a.schedule_id] = (assignmentCounts[a.schedule_id] ?? 0) + 1
        }
    })

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl shrink-0">
                    <Link href="/payroll"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1">
                    <VisualReportHeader
                        title="Turnos y Horarios"
                        subtitle="Configura los turnos de trabajo y asignalos a empleados"
                        tenant={tenant}
                    />
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                        <CalendarClock className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Turnos</p>
                        <p className="text-xl font-bold text-slate-900">{schedules.length}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                        <Users className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Empleados Asignados</p>
                        <p className="text-xl font-bold text-slate-900">
                            {Object.values(assignmentCounts).reduce((a, b) => a + b, 0)}
                        </p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                        <Users className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sin Turno (Default)</p>
                        <p className="text-xl font-bold text-slate-900">
                            {assignments.filter(a => !a.schedule_id).length}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Left: Create form */}
                <div className="col-span-12 lg:col-span-4">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 sticky top-24">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <CalendarClock className="h-4 w-4 text-indigo-600" />
                            Nuevo Turno
                        </h3>
                        <ScheduleForm />
                    </div>
                </div>

                {/* Right: List + Assignments */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    {/* Schedule List */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900">Turnos Configurados ({schedules.length})</h3>
                        </div>
                        <ScheduleList schedules={schedules} assignmentCounts={assignmentCounts} />
                    </div>

                    {/* Assignment Table */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900">Asignacion de Turnos</h3>
                            <p className="text-[10px] text-slate-400 mt-0.5">Asigna un turno a cada empleado. Los no asignados usan el turno default.</p>
                        </div>
                        <ScheduleAssignment employees={assignments as any} schedules={schedules} />
                    </div>
                </div>
            </div>
        </div>
    )
}
