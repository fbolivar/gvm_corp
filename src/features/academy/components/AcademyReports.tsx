"use client"

import { Badge } from "@/shared/components/ui/badge"
import { Users, BookOpen, TrendingUp } from "lucide-react"

interface CourseReport {
    courseId: string
    title: string
    lessonCount: number
    usersStarted: number
    usersCompleted: number
    completionRate: number
}

interface AcademyReportsProps {
    reports: CourseReport[]
}

export function AcademyReports({ reports }: AcademyReportsProps) {
    const totalStarted = reports.reduce((s, r) => s + r.usersStarted, 0)
    const totalCompleted = reports.reduce((s, r) => s + r.usersCompleted, 0)
    const avgCompletion = reports.length > 0
        ? Math.round(reports.reduce((s, r) => s + r.completionRate, 0) / reports.length)
        : 0

    return (
        <div className="space-y-6">
            {/* Summary KPIs */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <Users className="h-4 w-4 text-indigo-600" />
                        </div>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Usuarios Activos</p>
                    <p className="text-xl font-bold text-slate-900 font-mono">{totalStarted}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-emerald-600" />
                        </div>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cursos Completados</p>
                    <p className="text-xl font-bold text-slate-900 font-mono">{totalCompleted}</p>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-amber-600" />
                        </div>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tasa Promedio</p>
                    <p className="text-xl font-bold text-slate-900 font-mono">{avgCompletion}%</p>
                </div>
            </div>

            {/* Course table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900">Adopcion por Curso</h3>
                </div>
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-50">
                            <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Curso</th>
                            <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Lecciones</th>
                            <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Iniciaron</th>
                            <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Completaron</th>
                            <th className="text-center px-4 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tasa</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-400">
                                    No hay cursos publicados aun
                                </td>
                            </tr>
                        ) : reports.map(r => (
                            <tr key={r.courseId} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 text-sm font-semibold text-slate-900">{r.title}</td>
                                <td className="px-4 py-3 text-center text-sm font-mono text-slate-500">{r.lessonCount}</td>
                                <td className="px-4 py-3 text-center text-sm font-mono text-slate-500">{r.usersStarted}</td>
                                <td className="px-4 py-3 text-center text-sm font-mono text-slate-500">{r.usersCompleted}</td>
                                <td className="px-4 py-3 text-center">
                                    <Badge className={`text-[10px] font-bold rounded-full px-2 ${
                                        r.completionRate >= 75 ? 'bg-emerald-50 text-emerald-700' :
                                        r.completionRate >= 40 ? 'bg-amber-50 text-amber-700' :
                                        'bg-rose-50 text-rose-700'
                                    }`}>
                                        {r.completionRate}%
                                    </Badge>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
