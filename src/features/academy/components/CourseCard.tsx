"use client"

import Link from "next/link"
import { BookOpen, Clock, GraduationCap, CheckCircle2 } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { CourseWithMeta, DIFFICULTY_CONFIG, MODULE_LABELS } from "../types"

interface CourseCardProps {
    course: CourseWithMeta
}

export function CourseCard({ course }: CourseCardProps) {
    const diff = DIFFICULTY_CONFIG[course.difficulty] ?? DIFFICULTY_CONFIG.BEGINNER
    const progress = course.lesson_count > 0
        ? Math.round((course.completed_count / course.lesson_count) * 100)
        : 0
    const isComplete = course.lesson_count > 0 && course.completed_count === course.lesson_count

    return (
        <Link
            href={`/academy/${course.slug}`}
            className="group block bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all overflow-hidden"
        >
            <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
                        {isComplete ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                            <BookOpen className="h-5 w-5 text-indigo-600" />
                        )}
                    </div>
                    <div className="flex gap-1.5">
                        <Badge className={`text-[9px] font-bold rounded-full px-2 py-0.5 ${diff.className}`}>
                            {diff.label}
                        </Badge>
                        {course.module_key && MODULE_LABELS[course.module_key] && (
                            <Badge variant="outline" className="text-[9px] font-semibold rounded-full px-2 py-0.5 border-slate-200 text-slate-500">
                                {MODULE_LABELS[course.module_key]}
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors line-clamp-2 text-sm">
                        {course.title}
                    </h3>
                    {course.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2">{course.description}</p>
                    )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            {course.lesson_count} lecciones
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {course.estimated_minutes} min
                        </span>
                    </div>
                    <span className="font-bold text-indigo-600">{progress}%</span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${isComplete ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </Link>
    )
}
