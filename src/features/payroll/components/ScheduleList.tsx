"use client"

import { useTransition } from "react"
import { WorkSchedule } from "../types"
import { deleteScheduleAction } from "../actions/scheduleActions"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Trash2, Clock, Moon, Sun, Star, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Props {
    schedules: WorkSchedule[]
    assignmentCounts: Record<string, number>
}

export function ScheduleList({ schedules, assignmentCounts }: Props) {
    const [isPending, startTransition] = useTransition()

    const handleDelete = (id: string, name: string) => {
        if (!confirm(`Eliminar turno "${name}"? Los empleados asignados quedaran sin turno.`)) return

        startTransition(async () => {
            try {
                await deleteScheduleAction(id)
                toast.success("Turno eliminado")
            } catch {
                toast.error("Error al eliminar")
            }
        })
    }

    return (
        <div className="divide-y divide-slate-50">
            {schedules.length === 0 ? (
                <div className="p-12 text-center">
                    <Clock className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-xs text-slate-400">No hay turnos configurados</p>
                </div>
            ) : schedules.map(schedule => {
                const count = assignmentCounts[schedule.id] ?? 0
                return (
                    <div key={schedule.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors group">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                            schedule.is_night_shift ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                            {schedule.is_night_shift ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-slate-900 truncate">{schedule.name}</p>
                                {schedule.is_default && (
                                    <Badge className="text-[8px] font-bold bg-emerald-50 text-emerald-600 border-emerald-200 px-1.5 py-0">
                                        <Star className="h-2.5 w-2.5 mr-0.5" /> Default
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                <span className="font-mono font-bold">{schedule.start_time} — {schedule.end_time}</span>
                                <span>Break: {schedule.break_minutes}min</span>
                                <span>Tolerancia: {schedule.grace_minutes}min</span>
                                <span className="text-indigo-500 font-semibold">{count} empleado{count !== 1 ? 's' : ''}</span>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(schedule.id, schedule.name)}
                            disabled={isPending}
                            className="h-8 w-8 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                    </div>
                )
            })}
        </div>
    )
}
