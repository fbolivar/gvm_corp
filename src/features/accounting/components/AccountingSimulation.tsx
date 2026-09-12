"use client"

import { Fragment, useState } from "react"
import { simulateSalesAccountingAction, type SimulationResult } from "../actions/simulationActions"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/shared/lib/utils"
import { Play, FileSpreadsheet, Loader2, AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react"

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

/** Etiqueta del documento simulado. Un pedido facturado se muestra con su factura de WorldOffice. */
function docLabel(d: { doc_type: string; invoice_numbers?: string[] }): string {
    if (d.doc_type === 'CREDIT_NOTE') return 'Nota crédito'
    if (d.doc_type === 'SALES_ORDER') {
        const fv = (d.invoice_numbers ?? []).join(', ')
        return fv ? `Pedido facturado · FV ${fv}` : 'Pedido facturado'
    }
    return 'Factura'
}

/**
 * Simulación de contabilización de ventas: muestra el asiento que generaría cada
 * documento SIN guardarlo. Es la herramienta con la que el contador valida la
 * parametrización antes de encender la contabilización automática.
 */
export function AccountingSimulation({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
    const [from, setFrom] = useState(defaultFrom)
    const [to, setTo] = useState(defaultTo)
    const [running, setRunning] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [result, setResult] = useState<SimulationResult | null>(null)
    const [expanded, setExpanded] = useState<string | null>(null)

    async function run() {
        setRunning(true)
        try {
            const res = await simulateSalesAccountingAction(from, to)
            if (res.error) { toast.error(res.error); return }
            setResult(res)
            if (res.documents.length === 0) toast.info('No hay facturas ni notas crédito en ese rango')
            else toast.success(`${res.totals.analizados} documento(s) simulados`)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'No se pudo ejecutar la simulación')
        } finally {
            setRunning(false)
        }
    }

    async function exportExcel() {
        if (!result || result.documents.length === 0) return
        setExporting(true)
        try {
            const ExcelJS = (await import('exceljs')).default
            const wb = new ExcelJS.Workbook()

            const ws = wb.addWorksheet('Resumen')
            ws.columns = [
                { header: 'Documento', key: 'num', width: 16 },
                { header: 'Tipo', key: 'tipo', width: 14 },
                { header: 'Fecha', key: 'fecha', width: 12 },
                { header: 'Cliente', key: 'cliente', width: 38 },
                { header: 'NIT/CC', key: 'nit', width: 14 },
                { header: 'Contribuyente', key: 'tipoc', width: 20 },
                { header: 'Forma pago', key: 'forma', width: 12 },
                { header: 'Base', key: 'base', width: 15 },
                { header: 'IVA', key: 'iva', width: 14 },
                { header: 'Retefuente', key: 'rf', width: 14 },
                { header: 'ReteICA', key: 'ica', width: 12 },
                { header: 'ReteIVA', key: 'riva', width: 12 },
                { header: 'Autorrenta', key: 'auto', width: 13 },
                { header: 'Cartera', key: 'cartera', width: 15 },
                { header: 'Total documento', key: 'tot', width: 16 },
                { header: 'Cuadra', key: 'ok', width: 9 },
                { header: 'Advertencias', key: 'warn', width: 60 },
            ]
            for (const d of result.documents) {
                ws.addRow({
                    num: d.number ?? '', tipo: docLabel(d),
                    fecha: d.issue_date ?? '', cliente: d.party_name, nit: d.party_doc,
                    tipoc: d.taxpayer_code ?? '', forma: d.payment_form ?? '',
                    base: d.base, iva: d.iva, rf: d.retefuente, ica: d.reteica, riva: d.reteiva,
                    auto: d.autorrenta, cartera: d.cartera, tot: d.doc_total,
                    ok: d.balanced ? 'Sí' : 'NO', warn: d.warnings.join(' | '),
                })
            }
            ws.getRow(1).font = { bold: true }
            for (const c of ['base', 'iva', 'rf', 'ica', 'riva', 'auto', 'cartera', 'tot']) {
                ws.getColumn(c).numFmt = '$#,##0'
            }

            const wd = wb.addWorksheet('Detalle del asiento')
            wd.columns = [
                { header: 'Documento', key: 'num', width: 16 },
                { header: 'Cuenta', key: 'cuenta', width: 14 },
                { header: 'Concepto', key: 'concepto', width: 22 },
                { header: 'IVA %', key: 'iva', width: 8 },
                { header: 'Débito', key: 'debito', width: 15 },
                { header: 'Crédito', key: 'credito', width: 15 },
            ]
            for (const d of result.documents) {
                for (const l of d.lines) {
                    wd.addRow({ num: d.number ?? '', cuenta: l.account_code, concepto: l.concept, iva: l.iva_rate ?? '', debito: l.debit, credito: l.credit })
                }
            }
            wd.getRow(1).font = { bold: true }
            wd.getColumn('debito').numFmt = '$#,##0'
            wd.getColumn('credito').numFmt = '$#,##0'

            const buf = await wb.xlsx.writeBuffer()
            const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
            const a = document.createElement('a')
            a.href = url
            a.download = `Simulacion_contabilizacion_${from}_a_${to}.xlsx`
            document.body.appendChild(a); a.click(); document.body.removeChild(a)
            URL.revokeObjectURL(url)
            toast.success('Archivo descargado')
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'No se pudo generar el Excel')
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Controles */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Desde</Label>
                        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-11 rounded-xl w-[170px]" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hasta</Label>
                        <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-11 rounded-xl w-[170px]" />
                    </div>
                    <Button onClick={run} disabled={running} className="h-11 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold gap-2">
                        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        Simular
                    </Button>
                    <Button
                        onClick={exportExcel}
                        disabled={exporting || !result || result.documents.length === 0}
                        variant="outline"
                        className="h-11 px-5 rounded-xl text-xs font-bold gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                        Exportar para el contador
                    </Button>
                </div>
                <p className="text-[11px] text-slate-400 mt-3">
                    La simulación NO guarda asientos: solo muestra lo que el sistema contabilizaría con la parametrización actual.
                </p>
            </div>

            {result && result.documents.length > 0 && (
                <>
                    {/* Totales */}
                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
                        {[
                            { label: 'Documentos', value: String(result.totals.analizados) },
                            { label: 'Contabilizables', value: String(result.totals.contabilizables) },
                            { label: 'Con advertencia', value: String(result.totals.con_advertencias) },
                            { label: 'Base', value: money(result.totals.base) },
                            { label: 'IVA', value: money(result.totals.iva) },
                            { label: 'Retenciones', value: money(result.totals.retefuente + result.totals.reteica + result.totals.reteiva) },
                            { label: 'Cartera', value: money(result.totals.cartera) },
                        ].map(k => (
                            <div key={k.label} className="bg-white rounded-xl border border-slate-100 p-4">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{k.label}</p>
                                <p className="text-sm font-black text-slate-900 tabular-nums mt-1">{k.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Detalle */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                                        <th className="text-left px-4 py-3">Documento</th>
                                        <th className="text-left px-4 py-3">Cliente</th>
                                        <th className="text-left px-4 py-3">Contribuyente</th>
                                        <th className="text-right px-4 py-3">Base</th>
                                        <th className="text-right px-4 py-3">IVA</th>
                                        <th className="text-right px-4 py-3">Retenciones</th>
                                        <th className="text-right px-4 py-3">Cartera</th>
                                        <th className="text-center px-4 py-3">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {result.documents.map(d => {
                                        const ret = d.retefuente + d.reteica + d.reteiva
                                        const open = expanded === d.id
                                        return (
                                            <Fragment key={d.id}>
                                                <tr
                                                    onClick={() => setExpanded(open ? null : d.id)}
                                                    className="hover:bg-slate-50/60 cursor-pointer"
                                                >
                                                    <td className="px-4 py-3">
                                                        <span className="font-bold text-slate-800">{d.number ?? '—'}</span>
                                                        <span className="block text-[10px] text-slate-400">
                                                            {docLabel(d)} · {d.issue_date}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 max-w-[240px] truncate">{d.party_name}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-50 rounded px-2 py-0.5">
                                                            {d.taxpayer_code ?? '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums">{money(d.base)}</td>
                                                    <td className="px-4 py-3 text-right tabular-nums">{money(d.iva)}</td>
                                                    <td className="px-4 py-3 text-right tabular-nums text-amber-700">{ret ? money(ret) : '—'}</td>
                                                    <td className="px-4 py-3 text-right tabular-nums font-bold">{money(d.cartera)}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        {d.warnings.length > 0 ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700" title={d.warnings.join(' | ')}>
                                                                <AlertTriangle className="h-3 w-3" /> Revisar
                                                            </span>
                                                        ) : d.balanced ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                                                <CheckCircle2 className="h-3 w-3" /> OK
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-rose-600">Descuadrado</span>
                                                        )}
                                                        <ChevronDown className={cn('inline-block h-3 w-3 ml-1 text-slate-300 transition-transform', open && 'rotate-180')} />
                                                    </td>
                                                </tr>
                                                {open && (
                                                    <tr className="bg-slate-50/60">
                                                        <td colSpan={8} className="px-6 py-4">
                                                            {d.warnings.length > 0 && (
                                                                <ul className="mb-3 space-y-1">
                                                                    {d.warnings.map((w, i) => (
                                                                        <li key={i} className="text-[11px] text-amber-700 flex items-start gap-1.5">
                                                                            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />{w}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                            <table className="w-full text-[11px]">
                                                                <thead className="text-slate-400">
                                                                    <tr>
                                                                        <th className="text-left py-1">Cuenta</th>
                                                                        <th className="text-left py-1">Concepto</th>
                                                                        <th className="text-right py-1">Débito</th>
                                                                        <th className="text-right py-1">Crédito</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {d.lines.map((l, i) => (
                                                                        <tr key={i} className="border-t border-slate-100">
                                                                            <td className="py-1 font-mono">{l.account_code}</td>
                                                                            <td className="py-1 text-slate-500">
                                                                                {l.concept}{l.iva_rate != null ? ` ${l.iva_rate}%` : ''}
                                                                            </td>
                                                                            <td className="py-1 text-right tabular-nums">{l.debit ? money(l.debit) : ''}</td>
                                                                            <td className="py-1 text-right tabular-nums">{l.credit ? money(l.credit) : ''}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
