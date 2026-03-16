import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { settingsService } from "@/features/settings/services/settingsService"
import { academyService } from "@/features/academy/services/academyService"
import { VisualReportHeader } from "@/features/accounting/components/VisualReportHeader"
import { LessonForm } from "@/features/academy/components/LessonForm"
import { ManageCourseClient } from "./ManageCourseClient"
import { Button } from "@/shared/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface Props {
    params: Promise<{ courseId: string }>
}

export default async function ManageCoursePage({ params }: Props) {
    const { courseId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const tenant = await settingsService.getTenantInfo(supabase)
    if (!tenant) redirect('/login')

    const result = await academyService.getCourseById(supabase, courseId)
    if (!result) notFound()

    const { course, lessons } = result

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl shrink-0">
                    <Link href="/academy/manage"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1">
                    <VisualReportHeader title={course.title} subtitle="Editar curso y gestionar lecciones" tenant={tenant} />
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Left: Add lesson */}
                <div className="col-span-12 lg:col-span-4">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 sticky top-24">
                        <h3 className="text-sm font-bold text-slate-900">Nueva Leccion</h3>
                        <LessonForm courseId={courseId} nextOrder={lessons.length} />
                    </div>
                </div>

                {/* Right: Course details + lessons */}
                <div className="col-span-12 lg:col-span-8">
                    <ManageCourseClient course={course} lessons={lessons} />
                </div>
            </div>
        </div>
    )
}
