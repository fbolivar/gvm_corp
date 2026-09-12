"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Upload, FileSpreadsheet, Loader2, ArrowRight, X } from "lucide-react"
import {
    parseBankRows, guessMapping, parseBankAmount,
    type ColumnMapping, type ParsedBankLine,
} from "../services/bankFileParser"
import { importBankStatementAction } from "../actions/reconciliationActions"

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`

/**
 * Carga el extracto tal como lo entrega el banco (Excel o CSV): lee el archivo,
 * propone qué columna es cuál, deja corregir el mapeo y muestra una vista previa
 * antes de importar. Reemplaza al cuadro de "pegar CSV" que exigía un formato
 * exacto y por eso nunca se usó.
 */
export function BankFileImporter({ accountId, accountName }: { accountId: string; accountName?: string }) {
    const router = useRouter()
    const [rows, setRows] = useState<unknown[][]>([])
    const [header, setHeader] = useState<unknown[]>([])
    const [mapping, setMapping] = useState<ColumnMapping | null>(null)
    const [fileName, setFileName] = useState("")
    const [importing, setImporting] = useState(false)
    const [reading, setReading] = useState(false)
    const [openingBalance, setOpeningBalance] = useState("0")
    const [closingBalance, setClosingBalance] = useState("0")

    async function handleFile(file: File) {
        setReading(true)
        try {
            const XLSX = await import('xlsx')
            const buf = await file.arrayBuffer()
            const wb = XLSX.read(buf, { type: 'array', cellDates: true })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const all = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true }) as unknown[][]
            if (all.length === 0) { toast.error('El archivo está vacío'); return }

            // El encabezado no siempre está en la primera fila (los bancos ponen
            // el logo y datos de la cuenta arriba): se busca la fila con más texto.
            let headerIdx = 0
            let mejor = -1
            for (let i = 0; i < Math.min(all.length, 15); i++) {
                const textos = all[i].filter(c => typeof c === 'string' && c.trim().length > 2).length
                if (textos > mejor) { mejor = textos; headerIdx = i }
            }

            const head = all[headerIdx]
            const guessed = guessMapping(head)
            setHeader(head)
            setRows(all.slice(headerIdx + 1))
            setFileName(file.name)
            setMapping({
                date: guessed.date ?? 0,
                description: guessed.description ?? 1,
                amount: guessed.amount,
                debit: guessed.debit,
                credit: guessed.credit,
                reference: guessed.reference,
            })
        } catch {
            toast.error('No se pudo leer el archivo. Debe ser Excel (.xlsx) o CSV.')
        } finally {
            setReading(false)
        }
    }

    const preview: { lines: ParsedBankLine[]; descartadas: number } = mapping
        ? parseBankRows(rows, mapping)
        : { lines: [], descartadas: 0 }

    const totalEntradas = preview.lines.filter(l => l.amount > 0).reduce((s, l) => s + l.amount, 0)
    const totalSalidas = preview.lines.filter(l => l.amount < 0).reduce((s, l) => s + l.amount, 0)
    const fechas = preview.lines.map(l => l.date).sort()

    async function handleImport() {
        if (!mapping || preview.lines.length === 0) return
        setImporting(true)
        try {
            const res = await importBankStatementAction({
                accountId,
                startDate: fechas[0],
                endDate: fechas[fechas.length - 1],
                openingBalance: parseBankAmount(openingBalance),
                closingBalance: parseBankAmount(closingBalance),
                lines: preview.lines,
            })
            if (!res.ok) { toast.error(res.error ?? 'No se pudo importar'); return }
            toast.success(`Extracto importado: ${res.lineas} movimiento(s)`)
            router.push(`/treasury/reconcile/${accountId}/match/${res.statementId}`)
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'No se pudo importar el extracto')
        } finally {
            setImporting(false)
        }
    }

    const columnas = header.map((h, i) => ({ i, label: `${i + 1}. ${String(h ?? '').slice(0, 24) || '(sin título)'}` }))

    const Selector = ({ campo, valor, opcional }: { campo: keyof ColumnMapping; valor?: number; opcional?: boolean }) => (
        <select
            value={valor ?? ''}
            onChange={(e) => setMapping(m => m ? { ...m, [campo]: e.target.value === '' ? undefined : Number(e.target.value) } : m)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"
        >
            {opcional && <option value="">— ninguna —</option>}
            {columnas.map(c => <option key={c.i} value={c.i}>{c.label}</option>)}
        </select>
    )

    return (
        <div className="space-y-6">
            {/* Paso 1: archivo */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Extracto del banco</h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Sube el archivo tal como lo descargas del banco{accountName ? ` para ${accountName}` : ''} — Excel (.xlsx) o CSV.
                        </p>
                    </div>
                    <label className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer hover:bg-slate-800">
                        {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Seleccionar archivo
                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleFile(f) }}
                        />
                    </label>
                </div>

                {fileName && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                        <span className="font-semibold">{fileName}</span>
                        <span className="text-slate-400">· {rows.length} fila(s) leída(s)</span>
                        <button
                            onClick={() => { setRows([]); setHeader([]); setMapping(null); setFileName('') }}
                            className="ml-2 text-slate-300 hover:text-rose-500"
                            aria-label="Quitar archivo"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Paso 2: mapeo */}
            {mapping && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">¿Qué columna es cuál?</h3>
                        <p className="text-xs text-slate-400 mt-1">
                            El sistema lo dedujo del encabezado. Corrige lo que haga falta: si el banco usa columnas
                            separadas de débito y crédito, deja "Valor" en ninguna.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha</Label>
                            <Selector campo="date" valor={mapping.date} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Descripción</Label>
                            <Selector campo="description" valor={mapping.description} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor (con signo)</Label>
                            <Selector campo="amount" valor={mapping.amount} opcional />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Débito / salidas</Label>
                            <Selector campo="debit" valor={mapping.debit} opcional />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Crédito / entradas</Label>
                            <Selector campo="credit" valor={mapping.credit} opcional />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Referencia (opcional)</Label>
                            <Selector campo="reference" valor={mapping.reference} opcional />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saldo inicial del extracto</Label>
                            <Input value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} className="h-10 rounded-xl" placeholder="0" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saldo final del extracto</Label>
                            <Input value={closingBalance} onChange={e => setClosingBalance(e.target.value)} className="h-10 rounded-xl" placeholder="0" />
                        </div>
                    </div>
                </div>
            )}

            {/* Paso 3: vista previa */}
            {mapping && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-50">
                        <div className="flex flex-wrap gap-6 text-xs">
                            <span><b className="text-slate-900">{preview.lines.length}</b> <span className="text-slate-400">movimientos</span></span>
                            <span className="text-emerald-600">Entradas <b>{money(totalEntradas)}</b></span>
                            <span className="text-rose-600">Salidas <b>{money(Math.abs(totalSalidas))}</b></span>
                            {preview.descartadas > 0 && (
                                <span className="text-slate-400">{preview.descartadas} fila(s) omitida(s) (encabezados, saldos, vacías)</span>
                            )}
                        </div>
                        <Button
                            onClick={handleImport}
                            disabled={importing || preview.lines.length === 0}
                            className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2"
                        >
                            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                            Importar y cruzar
                        </Button>
                    </div>

                    <div className="overflow-x-auto max-h-[420px]">
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-white">
                                <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                    <th className="text-left px-4 py-2">Fecha</th>
                                    <th className="text-left px-4 py-2">Descripción</th>
                                    <th className="text-right px-4 py-2">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {preview.lines.slice(0, 100).map((l, i) => (
                                    <tr key={i}>
                                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{l.date}</td>
                                        <td className="px-4 py-2 text-slate-700">{l.description}</td>
                                        <td className={`px-4 py-2 text-right tabular-nums font-semibold ${l.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {money(l.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {preview.lines.length > 100 && (
                            <p className="text-[11px] text-slate-400 text-center py-3">
                                Mostrando los primeros 100 de {preview.lines.length}. Se importan todos.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
