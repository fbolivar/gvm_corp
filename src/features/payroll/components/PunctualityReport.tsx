"use client"

import { useState } from "react"
import { PunctualityRecord } from "../types"
import { Clock, TrendingUp, AlertTriangle, Users, Timer, ChevronUp, ChevronDown } from "lucide-react"

interface Props {
    records: PunctualityRecord[]
    startDate: string
    endDate: string
}

type SortKey = 'name' | 'punctualityRate' | 'lateDays' | 'avgLateMinutes' | 'totalOvertimeHours'

export function PunctualityReport({ records, startDate, endDate }: Props) {
    const [sortKey, setSortKey] = useState<SortKey>('punctualityRate')
    const [sortAsc, setSortAsc] = useState(false)

    const sorted = [...records].sort((a, b) => {
        const mul = sortAsc ? 1 : -1
        if (sortKey === 'name') return mul * a.name.localeCompare(b.name)
        return mul * ((a[sortKey] ?? 0) - (b[sortKey] ?? 0))
    })

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortAsc(!sortAsc)
        else { setSortKey(key); setSortAsc(false) }
    }

    const SortIcon = ({ k }: { k: SortKey }) => {
        if (sortKey !== k) return null
        return sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
    }

    // KPIs
    const totalEmployees = records.length
    const avgPunctuality = records.length > 0
        ? Math.round(records.reduce((s, r) => s + r.punctualityRate, 0) / records.length)
        : 100
    const totalLateIncidents = records.reduce((s, r) => s + r.lateDays, 0)
    const totalAbsences = records.reduce((s, r) => s + r.absentDays, 0)
    const totalOT = records.reduce((s, r) => s + r.totalOvertimeHours, 0)

    const kpis = [
        { label: 'Puntualidad Promedio', value: `${avgPunctuality}%`, icon: TrendingUp, color: avgPunctuality >= 95 ? 'emerald' : avgPunctuality >= 80 ? 'amber' : 'rose' },
        { label: 'Empleados', value: totalEmployees, icon: Users, color: 'indigo' },
        { label: 'Tardanzas', value: totalLateIncidents, icon: AlertTriangle, color: 'amber' },
        { label: 'Ausencias', value: totalAbsences, icon: Clock, color: 'rose' },
        { label: 'Horas Extra Total', value: `${totalOT.toFixed(1)}h`, icon: Timer, color: 'violet' },
    ]

    const punctualityColor = (rate: number) => {
        if (rate >= 95) return 'bg-emerald-500'
        if (rate >= 80) return 'bg-amber-500'
        return 'bg-rose-500'
    }

    const punctualityBadge = (rate: number) => {
        if (rate >= 95) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
        if (rate >= 80) return 'text-amber-700 bg-amber-50 border-amber-200'
        return 'text-rose-700 bg-rose-50 border-rose-200'
    }

    return (
        <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {kpis.map(kpi => (
                    <div key={kpi.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{kpi.label}</span>
                            <kpi.icon className={`h-4 w-4 text-${kpi.color}-500`} />
                        </div>
                        <p className="text-xl font-bold text-slate-900 tracking-tight">{kpi.value}</p>
                    </div>
                ))}
            </div>

            {/* Date range info */}
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                Periodo: {startDate} — {endDate}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                {[
                                    { key: 'name' as SortKey, label: 'Empleado' },
                                    { key: 'punctualityRate' as SortKey, label: 'Puntualidad' },
                                    { key: 'lateDays' as SortKey, label: 'Tardanzas' },
                                    { key: 'avgLateMinutes' as SortKey, label: 'Prom. Tardanza' },
                                    { key: 'totalOvertimeHours' as SortKey, label: 'Horas Extra' },
                                ].map(col => (
                                    <th
                                        key={col.key}
                                        onClick={() => toggleSort(col.key)}
                                        className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-900 select-none"
                                    >
                                        <div className="flex items-center gap-1">
                                            {col.label} <SortIcon k={col.key} />
                                        </div>
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wide text-right">Asistencia</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {sorted.map(r => (
                                <tr key={r.employee_id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="font-semibold text-slate-900 truncate max-w-[200px]">{r.name}</p>
                                        {r.position && <p className="text-[10px] text-slate-400">{r.position}</p>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${punctualityColor(r.punctualityRate)}`}
                                                    style={{ width: `${r.punctualityRate}%` }}
                                                />
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${punctualityBadge(r.punctualityRate)}`}>
                                                {r.punctualityRate}%
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-sm font-bold ${r.lateDays > 3 ? 'text-rose-600' : r.lateDays > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                            {r.lateDays}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {r.avgLateMinutes > 0 ? (
                                            <span className="text-amber-600 font-semibold">{r.avgLateMinutes} min</span>
                                        ) : (
                                            <span className="text-slate-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-semibold text-violet-600">
                                        {r.totalOvertimeHours > 0 ? `${r.totalOvertimeHours.toFixed(1)}h` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-xs text-slate-500">
                                            {r.presentDays}/{r.totalDays} dias
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {records.length === 0 && (
                    <div className="p-12 text-center">
                        <Clock className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-xs text-slate-400">No hay datos de asistencia para este periodo</p>
                    </div>
                )}
            </div>
        </div>
    )
}
