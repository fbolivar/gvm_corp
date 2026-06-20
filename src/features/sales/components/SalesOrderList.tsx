"use client"

import { useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Document } from "@/features/documents/types"
import { Button } from "@/shared/components/ui/button"
import {
    ShoppingCart,
    Receipt,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Eye,
    Clock,
    Send,
    CheckCircle2,
    XCircle,
    Plus,
    Calendar,
    FileOutput,
    Pencil,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/shared/lib/utils"
import { convertDocumentAction } from "../convertActions"
import { confirmSalesOrderAction } from "@/features/documents/actions"
import { toast } from "sonner"
import { useConfirm } from "@/shared/hooks/useConfirm"

interface SalesOrderListProps {
    orders: Document[]
    page: number
    totalPages: number
    baseParams: Record<string, string | undefined>
}

const STATUS_MAP: Record<string, { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }> = {
    DRAFT: { label: 'Borrador', className: 'bg-slate-50 text-slate-500', Icon: Clock },
    SENT: { label: 'Confirmado', className: 'bg-blue-50 text-blue-600', Icon: Send },
    ACCEPTED: { label: 'Facturado', className: 'bg-emerald-50 text-emerald-600', Icon: CheckCircle2 },
    REJECTED: { label: 'Rechazado', className: 'bg-rose-50 text-rose-600', Icon: XCircle },
    VOIDED: { label: 'Anulado', className: 'bg-rose-50 text-rose-600', Icon: XCircle },
}

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_MAP[status] ?? { label: status, className: 'bg-slate-50 text-slate-500', Icon: Clock }
    const { Icon } = cfg
    return (
        <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold', cfg.className)}>
            <Icon className="h-3 w-3" />
            {cfg.label}
        </span>
    )
}

function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return '—'
    try {
        return new Date(dateStr).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
    } catch {
        return dateStr
    }
}

export function SalesOrderList({ orders, page, totalPages, baseParams }: SalesOrderListProps) {
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [ConfirmDialogEl, confirmFn] = useConfirm()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const goToPage = (p: number) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('page', String(p))
        router.push(`${pathname}?${params.toString()}`)
    }

    const handleConvertToInvoice = async (docId: string) => {
        const ok = await confirmFn({ title: "Convertir a Factura", description: "¿Deseas convertir este pedido en una Factura?", variant: "warning", confirmLabel: "Confirmar" })
        if (!ok) return
        setProcessingId(docId)
        const result = await convertDocumentAction(docId, 'INVOICE')
        setProcessingId(null)
        if (result?.error) toast.error(result.error)
    }

    const handleConfirmOrder = async (docId: string) => {
        const ok = await confirmFn({
            title: "Confirmar Pedido",
            description: "Al confirmar, el pedido quedará listo para despacho en el módulo de Logística. Esta acción no se puede deshacer.",
            variant: "warning",
            confirmLabel: "Confirmar Pedido",
        })
        if (!ok) return
        setProcessingId(docId)
        const result = await confirmSalesOrderAction(docId)
        setProcessingId(null)
        if (result?.error) toast.error(result.error)
        else toast.success("Pedido confirmado — ya aparece en Logística")
    }

    const handleCreateDelivery = async (docId: string) => {
        const ok = await confirmFn({
            title: "Crear remisión",
            description: "Se generará una remisión (hoja de envío) desde este pedido. Podrás imprimirla para el despacho y luego facturar desde ella.",
            variant: "warning",
            confirmLabel: "Crear remisión",
        })
        if (!ok) return
        setProcessingId(docId)
        const result = await convertDocumentAction(docId, 'DELIVERY_NOTE')
        setProcessingId(null)
        if (result?.error) toast.error(result.error)
    }

    if (orders.length === 0) {
        return (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-slate-300" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-900">Sin Pedidos</h3>
                    <p className="text-xs text-slate-400 mt-1">No hay pedidos que coincidan con los filtros</p>
                </div>
                <Button asChild className="h-9 px-4 rounded-xl bg-indigo-600 text-white text-xs mt-2">
                    <Link href="/sales/orders/new">
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Crear pedido
                    </Link>
                </Button>
                {ConfirmDialogEl}
            </div>
        )
    }

    return (
        <div className="space-y-0">
            <div className="overflow-x-auto">
                <table className="w-full" role="table">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/60">
                            <th scope="col" className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pedido #</th>
                            <th scope="col" className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cliente</th>
                            <th scope="col" className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fecha</th>
                            <th scope="col" className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                            <th scope="col" className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total</th>
                            <th scope="col" className="px-5 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {orders.map((order) => (
                            <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-4">
                                    <span className="text-xs font-bold text-slate-900 font-mono">
                                        #{order.number ?? '—'}
                                    </span>
                                </td>
                                <td className="px-4 py-4 max-w-[160px] md:max-w-[220px]">
                                    <p className="text-xs font-bold text-slate-900 truncate leading-snug">
                                        {order.party?.legal_name || 'Consumidor Final'}
                                    </p>
                                    {order.party?.doc_number && (
                                        <p className="text-[10px] text-slate-400 mt-0.5">{order.party.doc_number}</p>
                                    )}
                                </td>
                                <td className="hidden md:table-cell px-4 py-4">
                                    <div className="flex items-center gap-1.5 text-slate-500">
                                        <Calendar className="h-3 w-3 text-slate-300 shrink-0" />
                                        <span className="text-[10px] text-slate-400">{formatDate(order.issue_date)}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <StatusBadge status={order.status} />
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                                        ${order.total.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                                    </span>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center justify-end gap-1.5">
                                        {order.status === 'DRAFT' && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-amber-600"
                                                    title="Editar borrador"
                                                    asChild
                                                >
                                                    <Link href={`/documents/${order.id}/edit`}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-[10px] font-semibold gap-1.5"
                                                    onClick={() => handleConfirmOrder(order.id!)}
                                                    disabled={processingId === order.id}
                                                >
                                                    {processingId === order.id
                                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        : <><Send className="h-3.5 w-3.5" /> Confirmar</>
                                                    }
                                                </Button>
                                            </>
                                        )}
                                        {order.status === 'SENT' && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 rounded-lg text-[10px] font-semibold gap-1.5 border-cyan-200 text-cyan-700 hover:bg-cyan-50"
                                                    onClick={() => handleCreateDelivery(order.id!)}
                                                    disabled={processingId === order.id}
                                                >
                                                    {processingId === order.id
                                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        : <><FileOutput className="h-3.5 w-3.5" /> Remisión</>
                                                    }
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-[10px] font-semibold gap-1.5"
                                                    onClick={() => handleConvertToInvoice(order.id!)}
                                                    disabled={processingId === order.id}
                                                >
                                                    {processingId === order.id
                                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        : <><Receipt className="h-3.5 w-3.5" /> Facturar</>
                                                    }
                                                </Button>
                                            </>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600"
                                            asChild
                                        >
                                            <Link href={`/documents/${order.id}`}>
                                                <Eye className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400">
                        Página <span className="font-semibold text-slate-600">{page}</span> de {totalPages}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg"
                            disabled={page <= 1}
                            onClick={() => goToPage(page - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg"
                            disabled={page >= totalPages}
                            onClick={() => goToPage(page + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
            {ConfirmDialogEl}
        </div>
    )
}
