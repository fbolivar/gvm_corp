"use client"

import { useState, useTransition } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { createScheduleAction } from "../actions/scheduleActions"
import { Loader2, Plus, CalendarDays } from "lucide-react"
import { WEEKDAY_LABELS } from "../utils/scheduleDay"
import { toast } from "sonner"

// Lunes a sábado; el domingo rara vez tiene turno propio y se puede agregar después.
const DAY_ROWS = [1, 2, 3, 4, 5, 6] as const

export function ScheduleForm() {
    const [isPending, startTransition] = useTransition()
    const [perDay, setPerDay] = useState(false)

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = e.currentTarget
        const formData = new FormData(form)

        startTransition(async () => {
            try {
                await createScheduleAction(formData)
                toast.success("Turno creado exitosamente")
                form.reset()
                setPerDay(false)
            } catch {
                toast.error("Error al crear turno")
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-600">Nombre del Turno</Label>
                <Input
                    id="name"
                    name="name"
                    required
                    placeholder="Ej: Turno Noche"
                    className="h-9 rounded-lg text-sm"
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                    <Label htmlFor="start_time" className="text-xs font-semibold text-slate-600">Hora Inicio</Label>
                    <Input
                        id="start_time"
                        name="start_time"
                        type="time"
                        required
                        defaultValue="08:00"
                        className="h-9 rounded-lg text-sm"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="end_time" className="text-xs font-semibold text-slate-600">Hora Fin</Label>
                    <Input
                        id="end_time"
                        name="end_time"
                        type="time"
                        required
                        defaultValue="17:00"
                        className="h-9 rounded-lg text-sm"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                    <Label htmlFor="break_minutes" className="text-xs font-semibold text-slate-600">Descanso (min)</Label>
                    <Input
                        id="break_minutes"
                        name="break_minutes"
                        type="number"
                        min={0}
                        max={120}
                        defaultValue={60}
                        className="h-9 rounded-lg text-sm"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="grace_minutes" className="text-xs font-semibold text-slate-600">Tolerancia (min)</Label>
                    <Input
                        id="grace_minutes"
                        name="grace_minutes"
                        type="number"
                        min={0}
                        max={60}
                        defaultValue={15}
                        className="h-9 rounded-lg text-sm"
                    />
                </div>
            </div>

            {/* Excepciones por día: solo se guardan los días que se llenen. */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={perDay}
                        onChange={(e) => setPerDay(e.target.checked)}
                        className="rounded border-slate-300"
                    />
                    <CalendarDays className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="text-xs font-semibold text-slate-600">El horario cambia según el día</span>
                </label>
                {perDay && (
                    <div className="space-y-2">
                        <p className="text-[11px] text-slate-500">
                            Llena solo los días distintos al horario de arriba; los demás quedan con el horario base.
                        </p>
                        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 gap-y-2 items-center">
                            {DAY_ROWS.map((d) => (
                                <div key={d} className="contents">
                                    <span className="text-xs font-medium text-slate-700">{WEEKDAY_LABELS[d]}</span>
                                    <Input name={`day_${d}_start`} type="time" className="h-8 w-28 rounded-lg text-xs" />
                                    <Input name={`day_${d}_end`} type="time" className="h-8 w-28 rounded-lg text-xs" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="is_night_shift" value="true" className="rounded border-slate-300" />
                    <span className="text-xs font-semibold text-slate-600">Turno Nocturno</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" name="is_default" value="true" className="rounded border-slate-300" />
                    <span className="text-xs font-semibold text-slate-600">Por Defecto</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer" title="Comerciales y socios: la marcación deja traza pero no cuenta retardo ni horas extra">
                    <input type="checkbox" name="is_flexible" value="true" className="rounded border-slate-300" />
                    <span className="text-xs font-semibold text-slate-600">Sin hora fija</span>
                </label>
            </div>

            <Button
                type="submit"
                disabled={isPending}
                className="w-full h-9 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700"
            >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Crear Turno</>}
            </Button>
        </form>
    )
}
