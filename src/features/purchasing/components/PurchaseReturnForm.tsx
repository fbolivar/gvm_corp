"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { toast } from "sonner"
import { RotateCcw, ArrowLeft, Save, Loader2 } from "lucide-react"
import Link from "next/link"
import { createPurchaseReturnAction } from "../actions/purchaseReturnActions"
import { cn } from "@/shared/lib/utils"
import { Hint } from "@/shared/components/ui/hint"

interface BillLine {
    id: string
    product_id: string | null
    description: string
    qty: number
    unit_price: number
    tax_config: unknown
}

interface VendorBill {
    id: string
    number: string
    total: number
    balance: number
    party_id: string
    warehouse_id: string | null
    parties: { legal_name: string; trade_name?: string } | null
    lines: BillLine[]
}

interface Props {
    vendorBills: VendorBill[]
}

const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

function lineIvaRate(taxConfig: unknown): number {
    if (Array.isArray(taxConfig) && taxConfig.length > 0) {
        const r = Number((taxConfig[0] as { rate?: unknown })?.rate)
        if (Number.isFinite(r)) return r
    }
    return 0
}

export function PurchaseReturnForm({ vendorBills }: Props) {
    const router = useRouter()
    const [selectedBillId, setSelectedBillId] = useState('')
    const [qtyByLine, setQtyByLine] = useState<Record<string, string>>({})
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)

    const bill = vendorBills.find(b => b.id === selectedBillId)

    const selectBill = (id: string) => {
        setSelectedBillId(id)
        setQtyByLine({})
    }

    // Total de la devolución (base + IVA) según cantidades ingresadas.
    const returnTotal = (bill?.lines ?? []).reduce((sum, l) => {
        const q = Math.min(Number(qtyByLine[l.id]) || 0, l.qty)
        const lineBase = q * l.unit_price
        return sum + lineBase + lineBase * (lineIvaRate(l.tax_config) / 100)
    }, 0)

    const handleSubmit = async () => {
        if (!bill) { toast.error("Selecciona una compra"); return }
        if (!reason.trim()) { toast.error("La razón es obligatoria"); return }

        const lines = bill.lines
            .map(l => ({ l, q: Math.min(Number(qtyByLine[l.id]) || 0, l.qty) }))
            .filter(({ q }) => q > 0)
            .map(({ l, q }) => ({
                product_id: l.product_id,
                description: l.description,
                qty: q,
                unit_cost: l.unit_price,
                tax_config: l.tax_config,
            }))

        if (lines.length === 0) { toast.error("Ingresa la cantidad a devolver en al menos un renglón"); return }

        setLoading(true)
        const result = await createPurchaseReturnAction({ parent_id: bill.id, reason: reason.trim(), lines })
        setLoading(false)

        if (result.error) { toast.error(result.error); return }
        toast.success(`Devolución ${result.number ?? ''} registrada`)
        if (result.warning) toast.warning(result.warning)
        router.push("/purchasing/returns")
        router.refresh()
    }

    return (
        <div className="space-y-8">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-rose-900 to-rose-800 p-10 text-white shadow-active">
                <div className="absolute top-0 right-0 p-8 opacity-[0.04] pointer-events-none">
                    <RotateCcw className="h-48 w-48" />
                </div>
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <Hint label="Volver" side="top">
                            <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-white/40 hover:text-white hover:bg-white/10">
                                <Link href="/purchasing/returns"><ArrowLeft className="h-5 w-5" /></Link>
                            </Button>
                        </Hint>
                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Compras</span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight uppercase">Nueva Devolución a Proveedor</h1>
                    <p className="text-white/40 text-xs font-bold">Descarga inventario y genera el asiento (DMP) sobre una compra</p>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-50 space-y-6">
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Compra (factura de proveedor)</label>
                    <select
                        value={selectedBillId}
                        onChange={e => selectBill(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300 bg-white"
                    >
                        <option value="">Seleccionar compra...</option>
                        {vendorBills.map(b => (
                            <option key={b.id} value={b.id}>
                                {b.number} — {b.parties?.trade_name || b.parties?.legal_name || 'Sin proveedor'} — Saldo: {fmt(b.balance ?? b.total)}
                            </option>
                        ))}
                    </select>
                </div>

                {bill && (
                    <>
                        {!bill.warehouse_id && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">
                                Esta compra no tiene bodega asignada: se registrará la devolución y el asiento, pero NO se descargará inventario.
                            </div>
                        )}
                        <div className="overflow-x-auto rounded-2xl border border-slate-100">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="text-left px-3 py-2">Producto</th>
                                        <th className="text-right px-3 py-2">Comprado</th>
                                        <th className="text-right px-3 py-2">Costo unit.</th>
                                        <th className="text-center px-3 py-2">IVA</th>
                                        <th className="text-right px-3 py-2 w-32">A devolver</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {bill.lines.length === 0 && (
                                        <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">La compra no tiene renglones</td></tr>
                                    )}
                                    {bill.lines.map(l => (
                                        <tr key={l.id}>
                                            <td className="px-3 py-2 text-slate-700">{l.description}</td>
                                            <td className="px-3 py-2 text-right font-mono tabular-nums">{l.qty}</td>
                                            <td className="px-3 py-2 text-right font-mono tabular-nums">{fmt(l.unit_price)}</td>
                                            <td className="px-3 py-2 text-center">{lineIvaRate(l.tax_config)}%</td>
                                            <td className="px-3 py-2 text-right">
                                                <input
                                                    type="number" min={0} max={l.qty} step="any"
                                                    value={qtyByLine[l.id] ?? ''}
                                                    onChange={e => setQtyByLine(prev => ({ ...prev, [l.id]: e.target.value }))}
                                                    placeholder="0"
                                                    className="w-24 h-9 px-2 rounded-lg border border-slate-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-end gap-2 text-sm">
                            <span className="text-slate-500">Total a devolver (con IVA):</span>
                            <span className="font-black text-rose-600 font-mono tabular-nums">{fmt(returnTotal)}</span>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Razón de la devolución</label>
                            <textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="Describe el motivo (producto defectuoso, error en el pedido, etc.)..."
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300 resize-none"
                            />
                        </div>
                    </>
                )}

                <div className="flex items-center gap-3 pt-2">
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !selectedBillId}
                        className="h-11 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Registrar Devolución
                    </Button>
                    <Button asChild variant="ghost" className="h-11 px-6 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600">
                        <Link href="/purchasing/returns">Cancelar</Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
