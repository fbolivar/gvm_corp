import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { academyService } from "@/features/academy/services/academyService"
import { settingsService } from "@/features/settings/services/settingsService"
import { VisualReportHeader } from "@/features/accounting/components/VisualReportHeader"
import { ProgressBar } from "@/features/academy/components/ProgressBar"
import { DIFFICULTY_CONFIG, MODULE_LABELS } from "@/features/academy/types"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, Clock, CheckCircle2, Circle, PlayCircle } from "lucide-react"

interface Props {
    params: Promise<{ slug: string }>
}

export default async function CourseDetailPage({ params }: Props) {
    const { slug } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const tenant = await settingsService.getTenantInfo(supabase)
    if (!tenant) redirect('/login')

    const result = await academyService.getCourseBySlug(supabase, slug, user.id)
    if (!result) notFound()

    const { course, lessons } = result
    const completedCount = lessons.filter(l => l.is_completed).length
    const diff = DIFFICULTY_CONFIG[course.difficulty] ?? DIFFICULTY_CONFIG.BEGINNER
    const moduleLabel = course.module_key ? MODULE_LABELS[course.module_key] : null

    // Find first incomplete lesson for "Continue" button
    const nextLesson = lessons.find(l => !l.is_completed) ?? lessons[0]

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl shrink-0">
                    <Link href="/academy"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1">
                    <VisualReportHeader title={course.title} subtitle={course.description || 'Curso de capacitacion'} tenant={tenant} />
                </div>
            </div>

            {/* Course info card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge className={`text-[10px] font-bold rounded-full px-2.5 py-0.5 ${diff.className}`}>
                        {diff.label}
                    </Badge>
                    {moduleLabel && (
                        <Badge variant="outline" className="text-[10px] font-semibold rounded-full px-2.5 py-0.5 border-slate-200 text-slate-500">
                            {moduleLabel}
                        </Badge>
                    )}
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="h-3 w-3" />
                        {course.estimated_minutes} min estimados
                    </span>
                </div>

                <ProgressBar completed={completedCount} total={lessons.length} />

                {nextLesson && (
                    <Button asChild className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
                        <Link href={`/academy/${slug}/${nextLesson.id}`}>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            {completedCount > 0 ? 'Continuar Curso' : 'Comenzar Curso'}
                        </Link>
                    </Button>
                )}
            </div>

            {/* Lessons list */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900">Lecciones ({lessons.length})</h3>
                </div>
                <div className="divide-y divide-slate-50">
                    {lessons.map((lesson, i) => (
                        <Link
                            key={lesson.id}
                            href={`/academy/${slug}/${lesson.id}`}
                            className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
                        >
                            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-50 text-xs font-bold text-slate-400 shrink-0 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                {lesson.is_completed ? (
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                ) : (
                                    <Circle className="h-5 w-5 text-slate-300" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors truncate">
                                    {i + 1}. {lesson.title}
                                </p>
                                <p className="text-[10px] text-slate-400">{lesson.estimated_minutes} min</p>
                            </div>
                            {lesson.is_completed && (
                                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold rounded-full shrink-0">
                                    Completada
                                </Badge>
                            )}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
