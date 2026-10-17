"use client"

import { Fragment, useState } from "react"
import { simulateCostOfSalesAction, type CostSimulationResult } from "../actions/simulationActions"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/shared/lib/utils"
import { Play, Loader2, AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react"

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

/**
 * Simulación del COSTO DE VENTA: por cada pedido facturado / factura muestra el
 * asiento (débito costo / crédito inventario por tarifa) con el último costo del
 * producto. NO guarda nada — es para que el contador valide antes de encender.
 */
export function CostOfSalesSimulation({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
    const [from, setFrom] = useState(defaultFrom)
    const [to, setTo] = useState(defaultTo)
    const [running, setRunning] = useState(false)
    const [result, setResult] = useState<CostSimulationResult | null>(null)
    const [expanded, setExpanded] = useState<string | null>(null)

    async function run() {
        setRunning(true)
        try {
            const res = await simulateCostOfSalesAction(from, to)
            if (res.error) { toast.error(res.error); return }
            setResult(res)
            if (res.documents.length === 0) toast.info('No hay ventas en ese rango')
            else toast.success(`${res.totals.analizados} documento(s) simulados`)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'No se pudo ejecutar la simulación')
        } finally {
            setRunning(false)
        }
    }

    return (
        <div className="space-y-5">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">
                Pendiente de confirmación del contador: cuentas por tarifa (costo 61352201/02/03 ↔ inventario 143501/03/05)
                y método de costo (hoy: último costo de <code>products.cost</code>). El costo de venta aún NO se contabiliza.
            </div>

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
                    {running ? <><Loader2 className="h-4 w-4 animate-spin" /> Simulando…</> : <><Play className="h-4 w-4" /> Simular costo</>}
                </Button>
            </div>

            {result && (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            ['Analizados', String(result.totals.analizados), 'text-slate-900'],
                            ['Con costo', String(result.totals.con_costo), 'text-emerald-600'],
                            ['Con avisos', String(result.totals.con_avisos), 'text-amber-600'],
                            ['Costo de venta total', money(result.totals.costo_total), 'text-slate-900'],
                        ].map(([label, val, color]) => (
                            <div key={label} className="bg-white rounded-xl border border-slate-100 p-3">
                                <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
                                <p className={cn('text-sm font-bold font-mono tabular-nums', color as string)}>{val}</p>
                            </div>
                        ))}
                    </div>
                    {result.totals.unidades_sin_costo > 0 && (
                        <p className="text-[12px] text-amber-700">
                            ⚠ {Math.round(result.totals.unidades_sin_costo)} unidad(es) vendida(s) de productos sin costo cargado: su costo de venta no se registra hasta cargar el costo.
                        </p>
                    )}

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="text-left px-3 py-2">Documento</th>
                                    <th className="text-left px-3 py-2">Cliente</th>
                                    <th className="text-right px-3 py-2">Costo de venta</th>
                                    <th className="text-center px-3 py-2">Estado</th>
                                    <th className="px-2 py-2"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {result.documents.length === 0 && (
                                    <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">Sin ventas en el rango</td></tr>
                                )}
                                {result.documents.map(d => (
                                    <Fragment key={d.id}>
                                        <tr className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setExpanded(expanded === d.id ? null : d.id)}>
                                            <td className="px-3 py-2 font-medium text-slate-800">{d.number ?? ''}</td>
                                            <td className="px-3 py-2 text-slate-600 truncate max-w-48">{d.party_name}</td>
                                            <td className="text-right px-3 py-2 font-mono tabular-nums font-semibold">{money(d.costo)}</td>
                                            <td className="text-center px-3 py-2">
                                                {d.warnings.length > 0
                                                    ? <AlertTriangle className="h-4 w-4 text-amber-500 inline" />
                                                    : d.balanced ? <CheckCircle2 className="h-4 w-4 text-emerald-500 inline" /> : <AlertTriangle className="h-4 w-4 text-rose-500 inline" />}
                                            </td>
                                            <td className="px-2 py-2 text-slate-300"><ChevronDown className={cn('h-4 w-4 transition-transform', expanded === d.id && 'rotate-180')} /></td>
                                        </tr>
                                        {expanded === d.id && (
                                            <tr><td colSpan={5} className="px-3 py-3 bg-slate-50/50">
                                                {d.warnings.length > 0 && (
                                                    <div className="mb-2 space-y-1">
                                                        {d.warnings.map((w, i) => <p key={i} className="text-[11px] text-amber-700">⚠ {w}</p>)}
                                                    </div>
                                                )}
                                                {d.lines.length === 0
                                                    ? <p className="text-[11px] text-slate-400">Sin costo registrado para este documento.</p>
                                                    : (
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
                                                    )}
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
