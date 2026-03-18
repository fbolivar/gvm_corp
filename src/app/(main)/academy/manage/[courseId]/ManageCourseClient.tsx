"use client"

import { useTransition } from "react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Course, Lesson, DIFFICULTY_CONFIG, MODULE_LABELS } from "@/features/academy/types"
import { togglePublishAction, deleteLessonAction } from "@/features/academy/actions"
import { Eye, EyeOff, Trash2, GripVertical, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useConfirm } from "@/shared/hooks/useConfirm"

interface ManageCourseClientProps {
    course: Course
    lessons: Lesson[]
}

export function ManageCourseClient({ course, lessons }: ManageCourseClientProps) {
    const [isPending, startTransition] = useTransition()
    const [ConfirmDialogEl, confirmFn] = useConfirm()
    const diff = DIFFICULTY_CONFIG[course.difficulty] ?? DIFFICULTY_CONFIG.BEGINNER
    const moduleLabel = course.module_key ? MODULE_LABELS[course.module_key] : null

    const handleTogglePublish = () => {
        startTransition(async () => {
            try {
                await togglePublishAction(course.id!, !course.is_published)
                toast.success(course.is_published ? "Curso despublicado" : "Curso publicado")
            } catch {
                toast.error("Error al cambiar estado")
            }
        })
    }

    const handleDeleteLesson = async (lessonId: string) => {
        const ok = await confirmFn({ title: "Confirmar", description: "Eliminar esta leccion?", variant: "danger", confirmLabel: "Confirmar" })
        if (!ok) return
        startTransition(async () => {
            try {
                await deleteLessonAction(lessonId)
                toast.success("Leccion eliminada")
            } catch {
                toast.error("Error al eliminar")
            }
        })
    }

    return (
        <div className="space-y-4">
            {ConfirmDialogEl}
            {/* Course info */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-900">{course.title}</h3>
                        <div className="flex items-center gap-2">
                            <Badge className={`text-[9px] font-bold rounded-full px-2 py-0 ${diff.className}`}>
                                {diff.label}
                            </Badge>
                            {moduleLabel && <span className="text-[10px] text-slate-400">{moduleLabel}</span>}
                            <span className="text-[10px] text-slate-400">{course.estimated_minutes} min</span>
                        </div>
                    </div>
                    <Button
                        onClick={handleTogglePublish}
                        disabled={isPending}
                        variant="outline"
                        className={`h-8 rounded-lg text-[10px] font-bold ${
                            course.is_published
                                ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : course.is_published ? (
                            <><Eye className="h-3.5 w-3.5 mr-1" /> Publicado</>
                        ) : (
                            <><EyeOff className="h-3.5 w-3.5 mr-1" /> Borrador</>
                        )}
                    </Button>
                </div>
                {course.description && (
                    <p className="text-xs text-slate-500">{course.description}</p>
                )}
            </div>

            {/* Lessons */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900">Lecciones ({lessons.length})</h3>
                </div>
                <div className="divide-y divide-slate-50">
                    {lessons.length === 0 ? (
                        <div className="p-12 text-center">
                            <FileText className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-xs text-slate-400">Agrega lecciones usando el formulario de la izquierda</p>
                        </div>
                    ) : lessons.map((lesson, i) => (
                        <div key={lesson.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors group">
                            <GripVertical className="h-4 w-4 text-slate-200 shrink-0" />
                            <div className="h-6 w-6 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                                {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{lesson.title}</p>
                                <p className="text-[10px] text-slate-400">{lesson.estimated_minutes} min | {(lesson.content?.length ?? 0)} caracteres</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteLesson(lesson.id!)}
                                disabled={isPending}
                                className="h-7 w-7 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
