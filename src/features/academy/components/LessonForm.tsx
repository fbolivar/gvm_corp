"use client"

import { useTransition, useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { Plus, Loader2 } from "lucide-react"
import { createLessonAction, updateLessonAction } from "../actions"
import { Lesson } from "../types"
import { toast } from "sonner"

interface LessonFormProps {
    courseId: string
    lesson?: Lesson
    nextOrder?: number
    onSuccess?: () => void
}

export function LessonForm({ courseId, lesson, nextOrder = 0, onSuccess }: LessonFormProps) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const isEditing = !!lesson

    const handleSubmit = (formData: FormData) => {
        setError(null)
        startTransition(async () => {
            try {
                if (isEditing && lesson?.id) {
                    await updateLessonAction(lesson.id, formData)
                    toast.success("Leccion actualizada")
                } else {
                    formData.set('course_id', courseId)
                    formData.set('sort_order', String(nextOrder))
                    await createLessonAction(formData)
                    toast.success("Leccion creada")
                    const form = document.getElementById('lesson-form') as HTMLFormElement
                    form?.reset()
                }
                onSuccess?.()
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Error'
                setError(msg)
                toast.error(msg)
            }
        })
    }

    return (
        <form id="lesson-form" action={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Titulo de la Leccion</Label>
                <Input name="title" required defaultValue={lesson?.title ?? ''} placeholder="Ej: Crear tu primera factura" className="h-9 bg-slate-50 border-slate-200 text-sm" />
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Contenido (Markdown)</Label>
                <Textarea
                    name="content"
                    rows={8}
                    defaultValue={lesson?.content ?? ''}
                    placeholder={"# Paso 1: Navega al modulo\n\nVe a **Ventas > Facturas** en el menu lateral.\n\n# Paso 2: Crear nueva factura\n\nHaz clic en el boton **Nuevo** ...\n\n> **Tip**: Puedes usar atajos de teclado para ir mas rapido."}
                    className="bg-slate-50 border-slate-200 text-sm font-mono resize-none"
                />
                <p className="text-[10px] text-slate-400">Usa # para titulos, **texto** para negrita, &gt; para tips</p>
            </div>

            <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tiempo Estimado (min)</Label>
                <Input name="estimated_minutes" type="number" defaultValue={lesson?.estimated_minutes ?? 5} min={1} className="h-9 bg-slate-50 border-slate-200 text-sm font-mono w-24" />
            </div>

            {error && <p className="text-rose-500 text-[10px]">{error}</p>}

            <Button type="submit" disabled={isPending} className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> {isEditing ? 'Guardar Cambios' : 'Agregar Leccion'}</>}
            </Button>
        </form>
    )
}
