"use client"

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
    PackageCheck,
    Package,
    CheckCircle2,
    Loader2,
    ChevronRight,
    AlertCircle,
    RefreshCw,
    Hash,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { PurchaseOrderWithDetails } from '@/features/purchasing/types'
import { receiveOrderAction } from '@/features/purchasing/actions/receiveOrderActions'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Props {
    order: PurchaseOrderWithDetails
}

type LineState = Record<string, string> // line.id → raw input value (string for controlled input)

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(amount)
}

function getPendingQty(qty: number, qtyReceived: number): number {
    return Math.max(0, Number(qty) - Number(qtyReceived))
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ReceiveOrderClient({ order }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    // Initialize: default input = pending amount (qty - qty_received)
    const [quantities, setQuantities] = useState<LineState>(() => {
        const initial: LineState = {}
        order.lines.forEach((line) => {
            const pending = getPendingQty(line.qty, line.qty_received ?? 0)
            initial[line.id!] = String(pending)
        })
        return initial
    })

    // Computed: which lines have qty > 0 in the current input
    const activeCount = order.lines.filter((l) => {
        const v = parseFloat(quantities[l.id!] ?? '0')
        return v > 0
    }).length

    // Fill all pending quantities
    const fillAll = useCallback(() => {
        const filled: LineState = {}
        order.lines.forEach((line) => {
            const pending = getPendingQty(line.qty, line.qty_received ?? 0)
            filled[line.id!] = String(pending)
        })
        setQuantities(filled)
    }, [order.lines])

    // Clear all quantities
    const clearAll = useCallback(() => {
        const cleared: LineState = {}
        order.lines.forEach((line) => {
            cleared[line.id!] = '0'
        })
        setQuantities(cleared)
    }, [order.lines])

    // Handle individual quantity change
    const handleQtyChange = (lineId: string, value: string) => {
        // Allow empty string while typing; only accept non-negative numbers
        if (value === '' || value === '-') {
            setQuantities((prev) => ({ ...prev, [lineId]: '' }))
            return
        }
        const num = parseFloat(value)
        if (isNaN(num)) return
        setQuantities((prev) => ({ ...prev, [lineId]: String(Math.max(0, num)) }))
    }

    // Submit reception
    const handleReceive = async () => {
        // Build lines: cumulative qty_received = already_received + new_input
        const lines = order.lines
            .map((line) => {
                const inputQty = parseFloat(quantities[line.id!] ?? '0') || 0
                return {
                    line_id: line.id!,
                    product_id: line.product_id,
                    qty_received: Number(line.qty_received ?? 0) + inputQty,
                    unit_cost: Number(line.unit_cost),
                    _inputQty: inputQty,
                }
            })
            .filter((l) => l._inputQty > 0)

        if (lines.length === 0) {
            toast.error('Debe recibir al menos un artículo con cantidad mayor a cero.')
            return
        }

        setLoading(true)
        try {
            const result = await receiveOrderAction(
                order.id!,
                lines.map(({ line_id, product_id, qty_received, unit_cost }) => ({
                    line_id,
                    product_id,
                    qty_received,
                    unit_cost,
                }))
            )

            if (result.error && !result.success) {
                toast.error(result.error)
                return
            }

            if (result.success && result.error) {
                // Partial success with warnings
                toast.warning(result.error)
                router.push('/purchasing/orders')
                return
            }

            toast.success('Mercancía recibida exitosamente. Movimientos de inventario creados.', {
                description: `${lines.length} línea${lines.length !== 1 ? 's' : ''} procesada${lines.length !== 1 ? 's' : ''}.`,
            })
            router.push('/purchasing/orders')
        } catch {
            toast.error('Error al procesar la recepción. Intente de nuevo.')
        } finally {
            setLoading(false)
        }
    }

    const hasAnyPending = order.lines.some(
        (l) => getPendingQty(l.qty, l.qty_received ?? 0) > 0
    )

    return (
        <div className="space-y-6">

            {/* ── Lines table card ─────────────────────────────────────────── */}
            <div className="bg-white rounded-[2.5rem] shadow-premium overflow-hidden">

                {/* Card header */}
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
                            <Package className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                                Líneas de la Orden
                            </h2>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                Ingrese cantidades a recibir en esta entrega
                            </p>
                        </div>
                    </div>

                    {/* Quick fill buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearAll}
                            disabled={loading}
                            className="h-9 px-4 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 font-black text-[9px] uppercase tracking-widest gap-1.5 transition-all"
                        >
                            <RefreshCw className="h-3 w-3" />
                            Limpiar
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={fillAll}
                            disabled={loading || !hasAnyPending}
                            className="h-9 px-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white hover:border-transparent font-black text-[9px] uppercase tracking-widest gap-1.5 transition-all active:scale-95"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Recibir todo
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full" role="table">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-50">
                                <th scope="col" className="px-8 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                    Producto
                                </th>
                                <th scope="col" className="px-4 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                    SKU
                                </th>
                                <th scope="col" className="px-4 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                    Ordenado
                                </th>
                                <th scope="col" className="px-4 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                    Ya recibido
                                </th>
                                <th scope="col" className="px-4 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                    Pendiente
                                </th>
                                <th scope="col" className="px-4 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                    Costo unit.
                                </th>
                                <th scope="col" className="px-8 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_theme(colors.emerald.500)]" />
                                        Cant. a recibir
                                    </div>
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-50">
                            {order.lines.map((line) => {
                                const alreadyReceived = Number(line.qty_received ?? 0)
                                const orderedQty = Number(line.qty)
                                const pendingQty = getPendingQty(orderedQty, alreadyReceived)
                                const inputVal = quantities[line.id!] ?? '0'
                                const inputNum = parseFloat(inputVal) || 0
                                const isFullyReceived = alreadyReceived >= orderedQty
                                const isOverReceiving = inputNum > pendingQty

                                return (
                                    <tr
                                        key={line.id}
                                        className={`transition-colors group/row ${isFullyReceived
                                                ? 'bg-slate-50/40 opacity-60'
                                                : 'hover:bg-emerald-50/20'
                                            }`}
                                    >
                                        {/* Product name */}
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner transition-transform duration-300 group-hover/row:rotate-3 ${isFullyReceived
                                                            ? 'bg-emerald-50 text-emerald-400'
                                                            : 'bg-slate-100 text-slate-400'
                                                        }`}
                                                >
                                                    {isFullyReceived ? (
                                                        <CheckCircle2 className="h-5 w-5" />
                                                    ) : (
                                                        <Package className="h-5 w-5" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-slate-900 truncate leading-tight">
                                                        {line.product?.name ?? 'Producto desconocido'}
                                                    </p>
                                                    {line.notes && (
                                                        <p className="text-[9px] text-slate-400 font-medium mt-0.5 truncate">
                                                            {line.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* SKU */}
                                        <td className="px-4 py-5 text-center">
                                            <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5">
                                                <Hash className="h-3 w-3 text-slate-300 shrink-0" />
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">
                                                    {line.product?.sku ?? '—'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Ordered */}
                                        <td className="px-4 py-5 text-right">
                                            <span className="text-sm font-black text-slate-600 font-mono">
                                                {orderedQty}
                                            </span>
                                        </td>

                                        {/* Already received */}
                                        <td className="px-4 py-5 text-right">
                                            <span
                                                className={`text-sm font-black font-mono ${alreadyReceived > 0 ? 'text-emerald-600' : 'text-slate-300'
                                                    }`}
                                            >
                                                {alreadyReceived}
                                            </span>
                                        </td>

                                        {/* Pending */}
                                        <td className="px-4 py-5 text-right">
                                            <span
                                                className={`inline-flex items-center justify-center min-w-[2.5rem] h-7 px-3 rounded-xl text-[11px] font-black font-mono ${pendingQty === 0
                                                        ? 'bg-emerald-50 text-emerald-500'
                                                        : 'bg-amber-50 text-amber-600'
                                                    }`}
                                            >
                                                {pendingQty}
                                            </span>
                                        </td>

                                        {/* Unit cost */}
                                        <td className="px-4 py-5 text-right">
                                            <span className="text-[11px] font-black text-slate-500 font-mono">
                                                {formatCOP(Number(line.unit_cost))}
                                            </span>
                                        </td>

                                        {/* Qty to receive input */}
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col items-center gap-1">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max={pendingQty + alreadyReceived}
                                                    step="1"
                                                    value={inputVal}
                                                    onChange={(e) =>
                                                        handleQtyChange(line.id!, e.target.value)
                                                    }
                                                    disabled={loading || isFullyReceived}
                                                    className={`w-24 h-10 text-center font-black text-sm rounded-2xl shadow-inner border-2 transition-all focus:ring-2 focus:ring-offset-0 font-mono ${isFullyReceived
                                                            ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                                                            : isOverReceiving
                                                                ? 'border-amber-200 bg-amber-50 text-amber-700 focus:border-amber-400 focus:ring-amber-200'
                                                                : inputNum > 0
                                                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 focus:border-emerald-400 focus:ring-emerald-200'
                                                                    : 'border-slate-200 bg-white text-slate-700 focus:border-emerald-400 focus:ring-emerald-200'
                                                        }`}
                                                />
                                                {isFullyReceived && (
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">
                                                        Completo
                                                    </span>
                                                )}
                                                {isOverReceiving && !isFullyReceived && (
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-amber-500">
                                                        Excede OC
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Empty state */}
                {order.lines.length === 0 && (
                    <div className="py-20 flex flex-col items-center gap-4 text-center">
                        <div className="h-16 w-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center shadow-inner text-slate-200">
                            <Package className="h-8 w-8" />
                        </div>
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                            Esta orden no tiene líneas
                        </p>
                    </div>
                )}
            </div>

            {/* ── Summary + Submit bar ──────────────────────────────────────── */}
            <div className="bg-white rounded-[2.5rem] shadow-premium overflow-hidden">
                <div className="px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">

                    {/* Summary */}
                    <div className="flex items-center gap-6">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner shrink-0">
                            <PackageCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 leading-none mb-1">
                                Resumen de recepcion
                            </p>
                            <p className="text-sm font-black text-slate-900">
                                <span className="text-emerald-600 text-lg">{activeCount}</span>{' '}
                                línea{activeCount !== 1 ? 's' : ''} con cantidad a registrar
                            </p>
                        </div>
                    </div>

                    {/* Warning if no active lines */}
                    {activeCount === 0 && (
                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-2.5">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                Ninguna cantidad ingresada
                            </span>
                        </div>
                    )}

                    {/* Submit */}
                    <Button
                        type="button"
                        onClick={handleReceive}
                        disabled={loading || activeCount === 0}
                        className="h-14 px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-active transition-all hover:scale-105 active:scale-95 border-none shrink-0 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? (
                            <span className="flex items-center gap-3">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span className="text-[10px] uppercase tracking-[0.2em]">
                                    Procesando...
                                </span>
                            </span>
                        ) : (
                            <span className="flex items-center gap-3">
                                <PackageCheck className="h-5 w-5" />
                                <span className="text-[10px] uppercase tracking-[0.2em]">
                                    Confirmar Recepción
                                </span>
                                <ChevronRight className="h-4 w-4 opacity-60" />
                            </span>
                        )}
                    </Button>
                </div>

                {/* Progress bar */}
                {order.lines.length > 0 && (
                    <div className="px-8 pb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                Progreso de recepción total
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">
                                {order.lines.filter(
                                    (l) => Number(l.qty_received ?? 0) >= Number(l.qty)
                                ).length}{' '}
                                /{' '}{order.lines.length} líneas completas
                            </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                style={{
                                    width: `${(order.lines.filter(
                                        (l) => Number(l.qty_received ?? 0) >= Number(l.qty)
                                    ).length /
                                        Math.max(order.lines.length, 1)) *
                                        100}%`,
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
