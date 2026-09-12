"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Receipt, X, Plus, Loader2 } from "lucide-react"

interface Props {
    open: boolean;
    /** Número del pedido, solo para el encabezado. */
    orderNumber?: string | null;
    /** Facturas ya registradas (al editar). */
    initial?: string[] | null;
    /** 'mark' = marcar como facturado · 'edit' = corregir las facturas registradas. */
    mode?: 'mark' | 'edit';
    busy?: boolean;
    onCancel: () => void;
    onConfirm: (invoiceNumbers: string[]) => void;
}

/**
 * Captura manual de los números de factura (FEV) de un pedido.
 * Un pedido puede facturarse en varias FEV, por eso se manejan como lista.
 */
export function InvoiceNumbersDialog({
    open, orderNumber, initial, mode = 'mark', busy, onCancel, onConfirm,
}: Props) {
    const [numbers, setNumbers] = useState<string[]>([])
    const [draft, setDraft] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (open) {
            setNumbers(initial ?? [])
            setDraft("")
            setTimeout(() => inputRef.current?.focus(), 60)
        }
    }, [open, initial])

    if (!open) return null

    const addDraft = (raw?: string) => {
        // Admite pegar varias separadas por coma, punto y coma o espacio.
        const parts = (raw ?? draft)
            .split(/[,;\n\t]+/)
            .map(p => p.trim().toUpperCase())
            .filter(Boolean)
        if (parts.length === 0) return
        setNumbers(prev => [...new Set([...prev, ...parts])])
        setDraft("")
    }

    const remove = (n: string) => setNumbers(prev => prev.filter(x => x !== n))

    const handleConfirm = () => {
        // Lo que quedó escrito sin confirmar también cuenta (evita perder el dato).
        const pending = draft.split(/[,;\n\t]+/).map(p => p.trim().toUpperCase()).filter(Boolean)
        onConfirm([...new Set([...numbers, ...pending])])
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
                <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                        <Receipt className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-base font-black text-slate-900">
                            {mode === 'edit' ? 'Facturas del pedido' : 'Marcar como facturado'}
                        </h2>
                        <p className="text-xs text-slate-500 leading-relaxed mt-1">
                            {mode === 'edit'
                                ? `Registra o corrige las facturas asociadas al pedido ${orderNumber ? `#${orderNumber}` : ''}.`
                                : `El pedido ${orderNumber ? `#${orderNumber} ` : ''}quedará marcado como FACTURADO. Registra el número de factura (FEV) para la trazabilidad contable.`}
                        </p>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 block">
                        Número de factura
                    </label>
                    <div className="flex gap-2">
                        <Input
                            ref={inputRef}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addDraft() }
                            }}
                            placeholder="Ej: FEV-1234"
                            className="h-11 rounded-xl font-mono text-sm uppercase"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => addDraft()}
                            disabled={!draft.trim()}
                            className="h-11 px-4 rounded-xl text-xs font-bold shrink-0"
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
                        </Button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                        Puedes registrar varias facturas: escribe una y pulsa Enter, o pégalas separadas por coma.
                    </p>
                </div>

                {numbers.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {numbers.map(n => (
                            <span
                                key={n}
                                className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono"
                            >
                                {n}
                                <button
                                    type="button"
                                    onClick={() => remove(n)}
                                    className="text-emerald-400 hover:text-emerald-700"
                                    aria-label={`Quitar factura ${n}`}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                <div className="flex flex-wrap justify-end gap-2 pt-1">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        disabled={busy}
                        className="h-11 px-4 rounded-xl text-xs font-bold border-slate-200 text-slate-500"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={busy}
                        className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                    >
                        {busy
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : mode === 'edit' ? 'Guardar facturas' : 'Marcar facturado'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
