"use client"

import { useTransition, useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { Plus, Loader2 } from "lucide-react"
import { createCourseAction } from "../actions"
import { MODULE_LABELS } from "../types"
import { toast } from "sonner"

export function CourseForm() {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = (formData: FormData) => {
        setError(null)
        startTransition(async () => {
            try {
                await createCourseAction(formData)
                toast.success("Curso creado exitosamente")
                // Reset form
                const form = document.getElementById('course-form') as HTMLFormElement
                form?.reset()
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Error al crear curso'
                setError(msg)
                toast.error(msg)
            }
        })
    }

    return (
        <form id="course-form" action={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Titulo del Curso</Label>
                <Input name="title" required minLength={3} placeholder="Ej: Facturacion Electronica" className="h-9 bg-slate-50 border-slate-200 text-sm" />
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Descripcion</Label>
                <Textarea name="description" rows={2} placeholder="Breve descripcion del curso..." className="bg-slate-50 border-slate-200 text-sm resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Modulo</Label>
                    <select name="module_key" className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm outline-none">
                        <option value="">General</option>
                        {Object.entries(MODULE_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Dificultad</Label>
                    <select name="difficulty" className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm outline-none">
                        <option value="BEGINNER">Principiante</option>
                        <option value="INTERMEDIATE">Intermedio</option>
                        <option value="ADVANCED">Avanzado</option>
                    </select>
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tiempo Estimado (min)</Label>
                <Input name="estimated_minutes" type="number" defaultValue={15} min={1} className="h-9 bg-slate-50 border-slate-200 text-sm font-mono" />
            </div>

            {error && <p className="text-rose-500 text-[10px]">{error}</p>}

            <Button type="submit" disabled={isPending} className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Crear Curso</>}
            </Button>
        </form>
    )
}
