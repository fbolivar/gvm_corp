import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { settingsService } from "@/features/settings/services/settingsService"
import { academyService } from "@/features/academy/services/academyService"
import { VisualReportHeader } from "@/features/accounting/components/VisualReportHeader"
import { CourseCard } from "@/features/academy/components/CourseCard"
import { MODULE_LABELS } from "@/features/academy/types"
import { Button } from "@/shared/components/ui/button"
import Link from "next/link"
import { ArrowLeft, BookOpen, GraduationCap, TrendingUp, CheckCircle2, Settings } from "lucide-react"

export default async function AcademyPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const tenant = await settingsService.getTenantInfo(supabase)
    if (!tenant) redirect('/login')

    const [courses, metrics] = await Promise.all([
        academyService.getCourses(supabase, user.id, true).catch(() => []),
        academyService.getMetrics(supabase, user.id).catch(() => ({
            totalCourses: 0, totalLessons: 0, completedCourses: 0, inProgressCourses: 0, overallCompletion: 0
        })),
    ])

    // Group courses by module
    const moduleKeys = [...new Set(courses.map(c => c.module_key || 'general'))]

    const kpis = [
        { label: 'Cursos', value: metrics.totalCourses, icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Completados', value: metrics.completedCourses, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'En Progreso', value: metrics.inProgressCourses, icon: GraduationCap, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Avance Total', value: `${metrics.overallCompletion}%`, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
    ]

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl shrink-0">
                    <Link href="/help"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1">
                    <VisualReportHeader title="Academia GVM" subtitle="Aprende a dominar el ERP paso a paso" tenant={tenant} />
                </div>
                <Button variant="outline" asChild className="h-9 rounded-xl text-xs font-semibold hidden md:flex">
                    <Link href="/academy/manage"><Settings className="h-4 w-4 mr-1.5" /> Gestionar</Link>
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg} ${kpi.color}`}>
                            <kpi.icon className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                            <p className="text-sm font-bold text-slate-900 font-mono tabular-nums">{kpi.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Courses by module */}
            {courses.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                    <GraduationCap className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-sm font-bold text-slate-400">No hay cursos disponibles aun</p>
                    <p className="text-xs text-slate-400 mt-1">Los administradores pueden crear cursos desde la seccion de gestion</p>
                </div>
            ) : (
                moduleKeys.map(mk => {
                    const moduleCourses = courses.filter(c => (c.module_key || 'general') === mk)
                    const label = mk === 'general' ? 'General' : (MODULE_LABELS[mk] ?? mk)

                    return (
                        <div key={mk} className="space-y-3">
                            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                {label}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {moduleCourses.map(course => (
                                    <CourseCard key={course.id} course={course} />
                                ))}
                            </div>
                        </div>
                    )
                })
            )}
        </div>
    )
}
