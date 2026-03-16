import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { settingsService } from "@/features/settings/services/settingsService"
import { academyService } from "@/features/academy/services/academyService"
import { VisualReportHeader } from "@/features/accounting/components/VisualReportHeader"
import { CourseForm } from "@/features/academy/components/CourseForm"
import { DIFFICULTY_CONFIG, MODULE_LABELS } from "@/features/academy/types"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, Edit3, Eye, EyeOff, BarChart3, BookOpen } from "lucide-react"

export default async function ManageAcademyPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const tenant = await settingsService.getTenantInfo(supabase)
    if (!tenant) redirect('/login')

    const courses = await academyService.getCourses(supabase, user.id, false).catch(() => [])

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl shrink-0">
                    <Link href="/academy"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1">
                    <VisualReportHeader title="Gestionar Academia" subtitle="Crear y administrar cursos de capacitacion" tenant={tenant} />
                </div>
                <Button variant="outline" asChild className="h-9 rounded-xl text-xs font-semibold hidden md:flex">
                    <Link href="/academy/reports"><BarChart3 className="h-4 w-4 mr-1.5" /> Reportes</Link>
                </Button>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Left: Create form */}
                <div className="col-span-12 lg:col-span-4">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 sticky top-24">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-indigo-600" />
                            Nuevo Curso
                        </h3>
                        <CourseForm />
                    </div>
                </div>

                {/* Right: Course list */}
                <div className="col-span-12 lg:col-span-8">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900">Todos los Cursos ({courses.length})</h3>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {courses.length === 0 ? (
                                <div className="p-12 text-center">
                                    <BookOpen className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                    <p className="text-xs text-slate-400">Crea tu primer curso con el formulario de la izquierda</p>
                                </div>
                            ) : courses.map(course => {
                                const diff = DIFFICULTY_CONFIG[course.difficulty] ?? DIFFICULTY_CONFIG.BEGINNER
                                const moduleLabel = course.module_key ? MODULE_LABELS[course.module_key] : null

                                return (
                                    <div key={course.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold text-slate-900 truncate">{course.title}</p>
                                                {course.is_published ? (
                                                    <Eye className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                                ) : (
                                                    <EyeOff className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge className={`text-[9px] font-bold rounded-full px-2 py-0 ${diff.className}`}>
                                                    {diff.label}
                                                </Badge>
                                                {moduleLabel && (
                                                    <span className="text-[10px] text-slate-400">{moduleLabel}</span>
                                                )}
                                                <span className="text-[10px] text-slate-400">{course.lesson_count} lecciones</span>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                                            <Link href={`/academy/manage/${course.id}`}>
                                                <Edit3 className="h-3.5 w-3.5" />
                                            </Link>
                                        </Button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
