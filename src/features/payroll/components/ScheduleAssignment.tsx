"use client"

import { useTransition } from "react"
import { WorkSchedule } from "../types"
import { assignScheduleAction } from "../actions/scheduleActions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface EmployeeAssignment {
    id: string;
    schedule_id: string | null;
    party: { legal_name: string } | { legal_name: string }[] | null;
}

interface Props {
    employees: EmployeeAssignment[]
    schedules: WorkSchedule[]
}

export function ScheduleAssignment({ employees, schedules }: Props) {
    const [isPending, startTransition] = useTransition()

    const handleChange = (employeeId: string, scheduleId: string) => {
        startTransition(async () => {
            try {
                await assignScheduleAction(employeeId, scheduleId || null)
                toast.success("Turno asignado")
            } catch {
                toast.error("Error al asignar turno")
            }
        })
    }

    const getName = (party: EmployeeAssignment['party']) => {
        if (!party) return 'Sin nombre'
        if (Array.isArray(party)) return party[0]?.legal_name || 'Sin nombre'
        return party.legal_name
    }

    return (
        <div className="space-y-1">
            <div className="flex items-center gap-4 px-4 py-2 bg-slate-50 rounded-t-xl">
                <span className="flex-1 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Empleado</span>
                <span className="w-48 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Turno Asignado</span>
            </div>

            <div className="divide-y divide-slate-50">
                {employees.map(emp => (
                    <div key={emp.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50/50 transition-colors">
                        <span className="flex-1 text-sm font-semibold text-slate-900 truncate">
                            {getName(emp.party)}
                        </span>
                        <div className="w-48 relative">
                            <select
                                value={emp.schedule_id ?? ''}
                                onChange={e => handleChange(emp.id, e.target.value)}
                                disabled={isPending}
                                className="w-full h-8 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 cursor-pointer hover:border-indigo-300 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all appearance-none"
                            >
                                <option value="">— Default del tenant —</option>
                                {schedules.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({s.start_time}-{s.end_time})
                                    </option>
                                ))}
                            </select>
                            {isPending && (
                                <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-slate-400" />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {employees.length === 0 && (
                <div className="p-8 text-center">
                    <p className="text-xs text-slate-400">No hay empleados activos</p>
                </div>
            )}
        </div>
    )
}
