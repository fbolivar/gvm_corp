'use client'

import { useMemo, useState } from 'react'
import { Search, Users } from 'lucide-react'
import { Card } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Input } from '@/shared/components/ui/input'

const CONTRACT_LABEL: Record<string, string> = {
    INDEFINIDO: 'Indefinido',
    FIJO: 'Fijo',
    OBRA_LABOR: 'Obra-Labor',
    APRENDIZAJE: 'Aprendizaje',
    PRESTACION_SERVICIOS: 'Prestacion Servicios',
}

interface Row {
    emp: {
        id?: string
        contract_type: string
    }
    settlement: {
        salary_base: number
        total_earnings: number
        total_deductions: number
        net_pay: number
    }
    party?: { legal_name?: string; doc_number?: string }
    companyCost: number
    attSummary?: {
        overtime: number
        night: number
        sunday: number
        daysPresent: number
        totalWorkedHours: number
    }
    hasAttendance: boolean
}

interface Props {
    rows: Row[]
    periodLabel: string
    // Totales del periodo completo — no se recalculan al filtrar para conservar
    // la consistencia del reporte financiero.
    totalEarnings: number
    totalDeductions: number
    totalNetPay: number
    totalCostEmp: number
    totalCost: number
    activeCount: number
}

const fmt = (n: number) =>
    `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

export function PayrollSummaryTable({
    rows,
    periodLabel,
    totalEarnings,
    totalDeductions,
    totalNetPay,
    totalCostEmp,
    totalCost,
    activeCount,
}: Props) {
    const [search, setSearch] = useState('')

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return rows
        return rows.filter((r) => {
            const name = r.party?.legal_name?.toLowerCase() ?? ''
            const doc = r.party?.doc_number?.toLowerCase() ?? ''
            const contract = (CONTRACT_LABEL[r.emp.contract_type] ?? r.emp.contract_type).toLowerCase()
            return name.includes(q) || doc.includes(q) || contract.includes(q)
        })
    }, [rows, search])

    return (
        <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">Liquidacion Consolidada</h3>
                    <p className="text-xs text-slate-400">
                        Devengados, Deducciones, Neto, Costo Empresa — {periodLabel}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                        <Input
                            placeholder="Buscar por nombre, documento o contrato..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9 rounded-xl text-xs bg-white border border-slate-200"
                        />
                    </div>
                    <span className="text-xs font-semibold text-indigo-600 whitespace-nowrap">
                        {search ? `${filtered.length} de ${activeCount}` : `${activeCount} empleados`}
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Empleado</th>
                            <th className="hidden lg:table-cell px-6 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Contrato</th>
                            <th className="hidden lg:table-cell px-6 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Salario Base</th>
                            <th className="hidden lg:table-cell px-6 py-3 text-right text-[10px] font-semibold text-violet-500 uppercase tracking-wider">Horas / HE</th>
                            <th className="px-6 py-3 text-right text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Devengado</th>
                            <th className="hidden md:table-cell px-6 py-3 text-right text-[10px] font-semibold text-rose-400 uppercase tracking-wider">Deducciones</th>
                            <th className="px-6 py-3 text-right text-[10px] font-semibold text-blue-500 uppercase tracking-wider">Neto</th>
                            <th className="hidden md:table-cell px-6 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Costo Empresa</th>
                            <th className="px-6 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Costo Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filtered.map(({ emp, settlement, party, companyCost, attSummary, hasAttendance }) => (
                            <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-3">
                                    <p className="text-xs font-bold text-slate-900">{party?.legal_name ?? 'Sin nombre'}</p>
                                    <p className="text-[10px] text-slate-400">{party?.doc_number ?? '—'}</p>
                                </td>
                                <td className="hidden lg:table-cell px-6 py-3">
                                    <span className="text-[10px] font-semibold text-indigo-600">
                                        {CONTRACT_LABEL[emp.contract_type] ?? emp.contract_type}
                                    </span>
                                </td>
                                <td className="hidden lg:table-cell px-6 py-3 text-right">
                                    <span className="text-xs text-slate-500 tabular-nums font-mono">{fmt(settlement.salary_base)}</span>
                                </td>
                                <td className="hidden lg:table-cell px-6 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                        <span className="text-xs text-slate-500 tabular-nums font-mono">
                                            {attSummary?.totalWorkedHours ? `${attSummary.totalWorkedHours.toFixed(0)}h` : '—'}
                                        </span>
                                        {hasAttendance && attSummary && (
                                            <Badge className="text-[8px] font-bold bg-violet-50 text-violet-600 border-violet-200 px-1 py-0">
                                                {attSummary.overtime.toFixed(1)} HE
                                            </Badge>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <span className="text-xs font-bold text-emerald-600 tabular-nums font-mono">
                                        {fmt(settlement.total_earnings)}
                                    </span>
                                </td>
                                <td className="hidden md:table-cell px-6 py-3 text-right">
                                    <span className="text-xs text-rose-500 tabular-nums font-mono">-{fmt(settlement.total_deductions)}</span>
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <span className="text-xs font-bold text-blue-600 tabular-nums font-mono">
                                        {fmt(settlement.net_pay)}
                                    </span>
                                </td>
                                <td className="hidden md:table-cell px-6 py-3 text-right">
                                    <span className="text-xs text-amber-600 tabular-nums font-mono">{fmt(companyCost)}</span>
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <span className="text-xs font-bold text-slate-900 tabular-nums font-mono">
                                        {fmt(settlement.net_pay + companyCost)}
                                    </span>
                                </td>
                            </tr>
                        ))}

                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-6 py-16 text-center">
                                    <Users className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                                    <p className="text-xs text-slate-400">
                                        {search
                                            ? `No hay coincidencias para "${search}"`
                                            : 'No hay empleados activos'}
                                    </p>
                                </td>
                            </tr>
                        )}
                    </tbody>

                    {rows.length > 0 && !search && (
                        <tfoot>
                            <tr className="bg-slate-50 border-t border-slate-200">
                                <td className="px-6 py-3">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                        Totales del Periodo
                                    </span>
                                </td>
                                <td className="hidden lg:table-cell px-6 py-3" colSpan={3} />
                                <td className="px-6 py-3 text-right">
                                    <span className="text-xs font-bold text-emerald-600 tabular-nums font-mono">{fmt(totalEarnings)}</span>
                                </td>
                                <td className="hidden md:table-cell px-6 py-3 text-right">
                                    <span className="text-xs font-bold text-rose-500 tabular-nums font-mono">-{fmt(totalDeductions)}</span>
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <span className="text-xs font-bold text-blue-600 tabular-nums font-mono">{fmt(totalNetPay)}</span>
                                </td>
                                <td className="hidden md:table-cell px-6 py-3 text-right">
                                    <span className="text-xs font-bold text-amber-600 tabular-nums font-mono">{fmt(totalCostEmp)}</span>
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <span className="text-sm font-bold text-slate-900 tabular-nums font-mono">{fmt(totalCost)}</span>
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </Card>
    )
}
