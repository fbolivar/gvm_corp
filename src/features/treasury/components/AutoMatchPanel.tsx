"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/shared/components/ui/button"
import { Zap, Loader2, Scale, ArrowRight } from "lucide-react"
import {
    autoMatchStatementAction,
    getReconciliationDifferencesAction,
    type DifferencesResult,
} from "../actions/reconciliationActions"

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

/**
 * Cruce automático del extracto contra el libro auxiliar y reporte de partidas
 * conciliatorias (lo que queda sin cruzar de cada lado). Es lo que pidió
 * revisoría: comparar los dos y ver las diferencias, sin hacerlo a mano.
 */
export function AutoMatchPanel({ statementId }: { statementId: string }) {
    const router = useRouter()
    const [running, setRunning] = useState(false)
    const [loadingDiff, setLoadingDiff] = useState(false)
    const [diff, setDiff] = useState<DifferencesResult | null>(null)

    async function runAutoMatch() {
        setRunning(true)
        try {
            const res = await autoMatchStatementAction(statementId)
            if (!res.ok) { toast.error(res.error ?? 'No se pudo cruzar'); return }
            toast.success(
                `Cruzados ${res.cruzadas} · ${res.ambiguas} con varios candidatos · ${res.sinCoincidencia} sin coincidencia`
            )
            await loadDiff()
            router.refresh()
        } finally {
            setRunning(false)
        }
    }

    async function loadDiff() {
        setLoadingDiff(true)
        try {
            const res = await getReconciliationDifferencesAction(statementId)
            if (res.error) { toast.error(res.error); return }
            setDiff(res)
        } finally {
            setLoadingDiff(false)
        }
    }

    const totalBanco = diff?.soloBanco.reduce((s, l) => s + l.amount, 0) ?? 0
    const totalLibro = diff?.soloLibro.reduce((s, l) => s + l.amount, 0) ?? 0

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Cruce contra el libro auxiliar</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-xl">
                            Empareja automáticamente los movimientos que coinciden en valor y fecha (±5 días).
                            Cuando hay más de un candidato posible, lo deja para que lo decidas tú.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            onClick={runAutoMatch}
                            disabled={running}
                            className="h-11 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold gap-2"
                        >
                            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                            Cruzar automáticamente
                        </Button>
                        <Button
                            onClick={loadDiff}
                            disabled={loadingDiff}
                            variant="outline"
                            className="h-11 px-5 rounded-xl text-xs font-bold gap-2 border-slate-200"
                        >
                            {loadingDiff ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
                            Ver diferencias
                        </Button>
                    </div>
                </div>
            </div>

            {diff && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <DiffList
                        titulo="En el banco, sin registrar en el sistema"
                        ayuda="Movimientos del extracto que no encontraron su par: consignaciones no registradas, cobros del banco, notas débito."
                        items={diff.soloBanco}
                        total={totalBanco}
                        tono="rose"
                    />
                    <DiffList
                        titulo="Registrado en el sistema, sin reflejar en el banco"
                        ayuda="Movimientos del libro que el banco todavía no muestra: cheques girados sin cobrar, consignaciones en tránsito."
                        items={diff.soloLibro}
                        total={totalLibro}
                        tono="amber"
                    />
                </div>
            )}
        </div>
    )
}

function DiffList({ titulo, ayuda, items, total, tono }: {
    titulo: string;
    ayuda: string;
    items: Array<{ id: string; date: string; description: string; amount: number }>;
    total: number;
    tono: 'rose' | 'amber';
}) {
    const color = tono === 'rose' ? 'text-rose-600' : 'text-amber-600'
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-50">
                <div className="flex items-center justify-between gap-3">
                    <h4 className="text-xs font-bold text-slate-900">{titulo}</h4>
                    <span className={`text-xs font-black tabular-nums ${color}`}>{money(total)}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{ayuda}</p>
                <p className="text-[11px] text-slate-500 mt-2 font-semibold">{items.length} partida(s)</p>
            </div>
            {items.length === 0 ? (
                <div className="py-10 text-center">
                    <ArrowRight className="h-5 w-5 text-emerald-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">Todo cruzado por este lado</p>
                </div>
            ) : (
                <div className="overflow-x-auto max-h-[380px]">
                    <table className="w-full text-xs">
                        <tbody className="divide-y divide-slate-50">
                            {items.map(l => (
                                <tr key={l.id}>
                                    <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{l.date}</td>
                                    <td className="px-4 py-2 text-slate-700 max-w-[280px] truncate" title={l.description}>{l.description}</td>
                                    <td className={`px-4 py-2 text-right tabular-nums font-semibold ${l.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {money(l.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
