"use client"

import { Fragment, useState } from "react"
import { simulatePurchaseAccountingAction, type PurchaseSimulationResult } from "../actions/simulationActions"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/shared/lib/utils"
import { Play, Loader2, AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react"

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

const docLabel = (t: string) => t === 'PURCHASE_RETURN' ? 'Devolución a proveedor' : 'Compra'

/**
 * Simulación de contabilización de COMPRAS: muestra el asiento que generaría cada
 * compra o devolución SIN guardarlo, para que el contador valide la parametrización.
 */
export function PurchaseAccountingSimulation({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
    const [from, setFrom] = useState(defaultFrom)
    const [to, setTo] = useState(defaultTo)
    const [running, setRunning] = useState(false)
    const [result, setResult] = useState<PurchaseSimulationResult | null>(null)
    const [expanded, setExpanded] = useState<string | null>(null)

    async function run() {
        setRunning(true)
        try {
            const res = await simulatePurchaseAccountingAction(from, to)
            if (res.error) { toast.error(res.error); return }
            setResult(res)
            if (res.documents.length === 0) toast.info('No hay compras ni devoluciones en ese rango')
            else toast.success(`${res.totals.analizados} documento(s) simulados`)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'No se pudo ejecutar la simulación')
        } finally {
            setRunning(false)
        }
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                    <Label className="text-[11px] uppercase tracking-wider text-slate-500">Desde</Label>
                    <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-10 rounded-xl" />
                </div>
                <div className="space-y-1">
                    <Label className="text-[11px] uppercase tracking-wider text-slate-500">Hasta</Label>
                    <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-10 rounded-xl" />
                </div>
                <Button onClick={run} disabled={running} className="h-10 rounded-xl gap-2">
                    {running ? <><Loader2 className="h-4 w-4 animate-spin" /> Simulando…</> : <><Play className="h-4 w-4" /> Simular compras</>}
                </Button>
            </div>

            {result && (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                        {[
                            ['Analizados', result.totals.analizados, 'text-slate-900'],
                            ['Contabilizables', result.totals.contabilizables, 'text-emerald-600'],
                            ['Con avisos', result.totals.con_advertencias, 'text-amber-600'],
                            ['Base', money(result.totals.base), 'text-slate-900'],
                            ['IVA', money(result.totals.iva), 'text-indigo-600'],
                            ['Proveedores', money(result.totals.proveedores), 'text-slate-900'],
                        ].map(([label, val, color]) => (
                            <div key={String(label)} className="bg-white rounded-xl border border-slate-100 p-3">
                                <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
                                <p className={cn('text-sm font-bold font-mono tabular-nums', color as string)}>{val}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="text-left px-3 py-2">Documento</th>
                                    <th className="text-left px-3 py-2">Proveedor</th>
                                    <th className="text-right px-3 py-2">Base</th>
                                    <th className="text-right px-3 py-2">IVA</th>
                                    <th className="text-right px-3 py-2">A pagar</th>
                                    <th className="text-center px-3 py-2">Estado</th>
                                    <th className="px-2 py-2"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {result.documents.length === 0 && (
                                    <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">Sin compras en el rango</td></tr>
                                )}
                                {result.documents.map(d => (
                                    <Fragment key={d.id}>
                                        <tr className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setExpanded(expanded === d.id ? null : d.id)}>
                                            <td className="px-3 py-2 font-medium text-slate-800">{docLabel(d.doc_type)} {d.number ?? ''}</td>
                                            <td className="px-3 py-2 text-slate-600 truncate max-w-48">{d.party_name}</td>
                                            <td className="text-right px-3 py-2 font-mono tabular-nums">{money(d.base)}</td>
                                            <td className="text-right px-3 py-2 font-mono tabular-nums text-indigo-600">{money(d.iva)}</td>
                                            <td className="text-right px-3 py-2 font-mono tabular-nums font-semibold">{money(d.proveedores)}</td>
                                            <td className="text-center px-3 py-2">
                                                {d.warnings.length > 0
                                                    ? <AlertTriangle className="h-4 w-4 text-amber-500 inline" />
                                                    : d.balanced ? <CheckCircle2 className="h-4 w-4 text-emerald-500 inline" /> : <AlertTriangle className="h-4 w-4 text-rose-500 inline" />}
                                            </td>
                                            <td className="px-2 py-2 text-slate-300"><ChevronDown className={cn('h-4 w-4 transition-transform', expanded === d.id && 'rotate-180')} /></td>
                                        </tr>
                                        {expanded === d.id && (
                                            <tr><td colSpan={7} className="px-3 py-3 bg-slate-50/50">
                                                {d.warnings.length > 0 && (
                                                    <div className="mb-2 space-y-1">
                                                        {d.warnings.map((w, i) => <p key={i} className="text-[11px] text-amber-700">⚠ {w}</p>)}
                                                    </div>
                                                )}
                                                <table className="w-full text-[11px]">
                                                    <thead><tr className="text-slate-400">
                                                        <th className="text-left py-1">Cuenta</th><th className="text-left py-1">Concepto</th>
                                                        <th className="text-right py-1">Débito</th><th className="text-right py-1">Crédito</th>
                                                    </tr></thead>
                                                    <tbody>
                                                        {d.lines.map((l, i) => (
                                                            <tr key={i} className="border-t border-slate-100">
                                                                <td className="py-1 font-mono">{l.account_code}</td>
                                                                <td className="py-1">{l.concept}{l.iva_rate != null ? ` ${l.iva_rate}%` : ''}</td>
                                                                <td className="py-1 text-right font-mono tabular-nums">{l.debit ? money(l.debit) : ''}</td>
                                                                <td className="py-1 text-right font-mono tabular-nums">{l.credit ? money(l.credit) : ''}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </td></tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    )
}
