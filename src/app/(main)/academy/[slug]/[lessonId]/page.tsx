import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { academyService } from "@/features/academy/services/academyService"
import { settingsService } from "@/features/settings/services/settingsService"
import { LessonViewer } from "@/features/academy/components/LessonViewer"
import { LessonNav } from "@/features/academy/components/LessonNav"
import { Button } from "@/shared/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Clock } from "lucide-react"

interface Props {
    params: Promise<{ slug: string; lessonId: string }>
}

export default async function LessonPage({ params }: Props) {
    const { slug, lessonId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const tenant = await settingsService.getTenantInfo(supabase)
    if (!tenant) redirect('/login')

    const courseData = await academyService.getCourseBySlug(supabase, slug, user.id)
    if (!courseData) notFound()

    const { course, lessons } = courseData
    const lesson = lessons.find(l => l.id === lessonId)
    if (!lesson) notFound()

    const currentIndex = lessons.findIndex(l => l.id === lessonId)

    return (
        <div className="page-container pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Button variant="outline" size="icon" asChild className="h-9 w-9 rounded-xl shrink-0">
                    <Link href={`/academy/${slug}`}><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">{course.title}</p>
                    <h1 className="text-lg font-bold text-slate-900 truncate">
                        {currentIndex + 1}. {lesson.title}
                    </h1>
                </div>
                <span className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
                    <Clock className="h-3 w-3" />
                    {lesson.estimated_minutes} min
                </span>
            </div>

            {/* Content + Nav */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
                        <LessonViewer content={lesson.content} />
                    </div>
                </div>
                <div className="lg:col-span-4">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sticky top-24">
                        <LessonNav
                            slug={slug}
                            courseId={course.id!}
                            lessons={lessons}
                            currentLessonId={lessonId}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
