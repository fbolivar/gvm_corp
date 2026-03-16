"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { toast } from "sonner"
import { RotateCcw, ArrowLeft, Save, Loader2 } from "lucide-react"
import Link from "next/link"
import { createPurchaseReturnAction } from "../actions/purchaseReturnActions"
import { cn } from "@/shared/lib/utils"

interface VendorBill {
    id: string
    number: string
    total: number
    balance: number
    party_id: string
    parties: { legal_name: string; trade_name?: string } | null
}

interface Props {
    vendorBills: VendorBill[]
}

const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(n)

export function PurchaseReturnForm({ vendorBills }: Props) {
    const router = useRouter()
    const [selectedBillId, setSelectedBillId] = useState('')
    const [amount, setAmount] = useState('')
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)

    const selectedBill = vendorBills.find(b => b.id === selectedBillId)

    const handleSubmit = async () => {
        if (!selectedBillId) {
            toast.error("Selecciona una factura de proveedor")
            return
        }
        const numAmount = Number(amount)
        if (!numAmount || numAmount <= 0) {
            toast.error("El monto debe ser mayor a 0")
            return
        }
        if (selectedBill && numAmount > (selectedBill.balance ?? selectedBill.total)) {
            toast.error("El monto excede el saldo de la factura")
            return
        }
        if (!reason.trim()) {
            toast.error("La razón es requerida")
            return
        }

        setLoading(true)
        const result = await createPurchaseReturnAction({
            parent_id: selectedBillId,
            party_id: selectedBill!.party_id,
            total: numAmount,
            reason: reason.trim(),
        })
        setLoading(false)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Devolución registrada exitosamente")
            router.push("/purchasing/returns")
            router.refresh()
        }
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-rose-900 to-rose-800 p-10 text-white shadow-active">
                <div className="absolute top-0 right-0 p-8 opacity-[0.04] pointer-events-none">
                    <RotateCcw className="h-48 w-48" />
                </div>
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-xl text-white/40 hover:text-white hover:bg-white/10"
                        >
                            <Link href="/purchasing/returns">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Compras</span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight uppercase">Nueva Devolución</h1>
                    <p className="text-white/40 text-xs font-bold">Nota crédito sobre factura de proveedor</p>
                </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-50 space-y-6">
                {/* Select Vendor Bill */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Factura de Proveedor
                    </label>
                    <select
                        value={selectedBillId}
                        onChange={e => {
                            setSelectedBillId(e.target.value)
                            setAmount('')
                        }}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300 bg-white"
                    >
                        <option value="">Seleccionar factura...</option>
                        {vendorBills.map(bill => (
                            <option key={bill.id} value={bill.id}>
                                {bill.number} — {bill.parties?.trade_name || bill.parties?.legal_name || 'Sin proveedor'} — Saldo: {fmt(bill.balance ?? bill.total)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Selected Bill Summary */}
                {selectedBill && (
                    <div className="bg-rose-50/50 rounded-2xl p-5 border border-rose-100 space-y-3">
                        <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">
                            Factura Seleccionada
                        </p>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <p className="text-xs text-slate-500">Número</p>
                                <p className="text-sm font-bold text-slate-900">{selectedBill.number}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Total</p>
                                <p className="text-sm font-bold text-slate-900">{fmt(selectedBill.total)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Saldo Disponible</p>
                                <p className="text-sm font-bold text-rose-600">
                                    {fmt(selectedBill.balance ?? selectedBill.total)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Amount */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Monto a Devolver (COP)
                    </label>
                    <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="0"
                        min={1}
                        max={selectedBill?.balance ?? selectedBill?.total ?? undefined}
                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300"
                    />
                    {selectedBill && Number(amount) > 0 && (
                        <p className="text-[9px] text-slate-400 font-bold">
                            Saldo restante después de devolución:{' '}
                            <span className={cn(
                                "font-black",
                                (selectedBill.balance ?? selectedBill.total) - Number(amount) < 0
                                    ? "text-rose-600"
                                    : "text-emerald-600"
                            )}>
                                {fmt(Math.max(0, (selectedBill.balance ?? selectedBill.total) - Number(amount)))}
                            </span>
                        </p>
                    )}
                </div>

                {/* Reason */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Razón de la Devolución
                    </label>
                    <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Describe el motivo de la devolución (producto defectuoso, error en pedido, etc.)..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300 resize-none"
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !selectedBillId}
                        className={cn(
                            "h-11 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white"
                        )}
                    >
                        {loading
                            ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            : <Save className="h-4 w-4 mr-2" />
                        }
                        Registrar Devolución
                    </Button>
                    <Button
                        asChild
                        variant="ghost"
                        className="h-11 px-6 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600"
                    >
                        <Link href="/purchasing/returns">Cancelar</Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
