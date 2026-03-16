"use client"

import { useTransition } from "react"
import Link from "next/link"
import { Button } from "@/shared/components/ui/button"
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Loader2 } from "lucide-react"
import { LessonWithProgress } from "../types"
import { markLessonCompleteAction } from "../actions"
import { toast } from "sonner"
import { cn } from "@/shared/lib/utils"

interface LessonNavProps {
    slug: string
    courseId: string
    lessons: LessonWithProgress[]
    currentLessonId: string
}

export function LessonNav({ slug, courseId, lessons, currentLessonId }: LessonNavProps) {
    const [isPending, startTransition] = useTransition()
    const currentIndex = lessons.findIndex(l => l.id === currentLessonId)
    const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null
    const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null
    const currentLesson = lessons[currentIndex]
    const isCompleted = currentLesson?.is_completed

    const handleComplete = () => {
        startTransition(async () => {
            try {
                await markLessonCompleteAction(currentLessonId, courseId)
                toast.success("Leccion completada")
            } catch {
                toast.error("Error al marcar como completada")
            }
        })
    }

    return (
        <div className="space-y-6">
            {/* Complete button */}
            {!isCompleted && (
                <Button
                    onClick={handleComplete}
                    disabled={isPending}
                    className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Completar Leccion
                </Button>
            )}

            {isCompleted && (
                <div className="flex items-center justify-center gap-2 py-2 px-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-700">Leccion completada</span>
                </div>
            )}

            {/* Prev/Next */}
            <div className="flex gap-3">
                {prevLesson ? (
                    <Button variant="outline" asChild className="flex-1 h-10 rounded-xl text-xs font-semibold">
                        <Link href={`/academy/${slug}/${prevLesson.id}`}>
                            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                        </Link>
                    </Button>
                ) : <div className="flex-1" />}
                {nextLesson ? (
                    <Button asChild className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">
                        <Link href={`/academy/${slug}/${nextLesson.id}`}>
                            Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                    </Button>
                ) : (
                    <Button asChild className="flex-1 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold">
                        <Link href={`/academy/${slug}`}>
                            Volver al Curso
                        </Link>
                    </Button>
                )}
            </div>

            {/* Lesson sidebar list */}
            <div className="space-y-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Lecciones</p>
                {lessons.map((lesson, i) => (
                    <Link
                        key={lesson.id}
                        href={`/academy/${slug}/${lesson.id}`}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors",
                            lesson.id === currentLessonId
                                ? "bg-indigo-50 text-indigo-700 font-bold"
                                : "hover:bg-slate-50 text-slate-600"
                        )}
                    >
                        {lesson.is_completed ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        ) : (
                            <Circle className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                        )}
                        <span className="truncate">{i + 1}. {lesson.title}</span>
                    </Link>
                ))}
            </div>
        </div>
    )
}
