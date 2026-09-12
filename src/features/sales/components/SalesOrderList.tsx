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
    Warehouse,
    BadgeCheck,
    RotateCcw,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/shared/lib/utils"
import { convertDocumentAction } from "../convertActions"
import { confirmSalesOrderAction, markSalesOrderInvoicedAction, updateInvoiceNumbersAction } from "@/features/documents/actions"
import { InvoiceNumbersDialog } from "./InvoiceNumbersDialog"
import { toast } from "sonner"
import { useConfirm } from "@/shared/hooks/useConfirm"
import { formatLocalDate } from "@/shared/lib/dateFmt"
import { Hint } from "@/shared/components/ui/hint"

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
    // Usa parseo local para no correr la fecha un día (bug UTC en fechas de solo día).
    return formatLocalDate(dateStr)
}

export function SalesOrderList({ orders, page, totalPages, baseParams }: SalesOrderListProps) {
    const [processingId, setProcessingId] = useState<string | null>(null)
    // Diálogo de captura de facturas (FEV) al marcar como facturado o al corregirlas.
    const [invoiceDialog, setInvoiceDialog] = useState<{
        id: string; number?: string | null; initial: string[]; mode: 'mark' | 'edit';
    } | null>(null)
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

    /** Desmarcar facturado (vuelve a Confirmado y limpia las facturas registradas). */
    const handleUnmarkInvoiced = async (docId: string) => {
        const ok = await confirmFn({
            title: "Marcar como NO facturado",
            description: "El pedido volverá a estado Confirmado (sin facturar) y se borrarán los números de factura registrados.",
            variant: "warning",
            confirmLabel: "Quitar facturado",
        })
        if (!ok) return
        setProcessingId(docId)
        const result = await markSalesOrderInvoicedAction(docId, false)
        setProcessingId(null)
        if (result?.error) toast.error(result.error)
        else toast.success("Pedido marcado como no facturado")
    }

    /** Confirma el diálogo: marca como facturado con sus FEV, o solo las actualiza. */
    const handleInvoiceDialogConfirm = async (numbers: string[]) => {
        if (!invoiceDialog) return
        const { id, mode } = invoiceDialog
        setProcessingId(id)
        const result = mode === 'mark'
            ? await markSalesOrderInvoicedAction(id, true, numbers)
            : await updateInvoiceNumbersAction(id, numbers)
        setProcessingId(null)
        if (result?.error) {
            toast.error(result.error)
            return
        }
        setInvoiceDialog(null)
        toast.success(
            mode === 'mark'
                ? numbers.length > 0
                    ? `Pedido facturado · ${numbers.join(', ')}`
                    : "Pedido marcado como facturado"
                : "Facturas actualizadas"
        )
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
            <div className="divide-y divide-slate-100">
                {orders.map((order) => {
                    const client = order.party?.legal_name || 'Consumidor Final'
                    const busy = processingId === order.id
                    return (
                        <div key={order.id} className="p-4 sm:px-5 sm:py-4 hover:bg-slate-50/60 transition-colors">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                {/* Identidad del pedido */}
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                        <ShoppingCart className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-black text-slate-900 font-mono tracking-tight">#{order.number ?? '—'}</span>
                                            <StatusBadge status={order.status} />
                                        </div>
                                        <p className="text-sm font-bold text-slate-800 truncate mt-0.5">{client}</p>
                                        <div className="flex items-center gap-x-3 gap-y-1 mt-1.5 flex-wrap text-[11px] font-medium text-slate-500">
                                            <span className="inline-flex items-center gap-1">
                                                <Warehouse className="h-3.5 w-3.5 text-slate-400" />
                                                {order.warehouse?.name || 'Sin bodega'}
                                            </span>
                                            <span className="inline-flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                {formatDate(order.issue_date)}
                                            </span>
                                            {order.party?.doc_number && (
                                                <span className="text-slate-400">NIT {order.party.doc_number}</span>
                                            )}
                                        </div>

                                        {/* Facturas (FEV) asociadas — trazabilidad contable del pedido */}
                                        {order.invoice_numbers && order.invoice_numbers.length > 0 && (
                                            <div className="flex items-center gap-2 flex-wrap mt-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {order.invoice_numbers.length > 1 ? 'Facturas' : 'Factura'}
                                                </span>
                                                {order.invoice_numbers.map((inv) => (
                                                    <span
                                                        key={inv}
                                                        className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 rounded-lg px-2.5 py-1 text-sm font-black font-mono tracking-tight"
                                                    >
                                                        <Receipt className="h-3.5 w-3.5" />
                                                        {inv}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Total + acciones */}
                                <div className="flex items-center justify-between gap-4 lg:gap-6 lg:shrink-0 pl-[52px] lg:pl-0">
                                    <div className="text-right shrink-0">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total</p>
                                        <p className="text-base sm:text-lg font-black text-slate-900 tabular-nums leading-none mt-0.5">
                                            ${order.total.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {order.status === 'DRAFT' && (
                                            <>
                                                <Hint label="Editar borrador" side="top">
                                                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-amber-600" asChild>
                                                        <Link href={`/documents/${order.id}/edit`}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                </Hint>
                                                <Button
                                                    size="sm"
                                                    className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-[10px] font-semibold gap-1.5"
                                                    onClick={() => handleConfirmOrder(order.id!)}
                                                    disabled={busy}
                                                >
                                                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Send className="h-3.5 w-3.5" /> Confirmar</>}
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
                                                    disabled={busy}
                                                >
                                                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><FileOutput className="h-3.5 w-3.5" /> Remisión</>}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-[10px] font-semibold gap-1.5"
                                                    onClick={() => handleConvertToInvoice(order.id!)}
                                                    disabled={busy}
                                                >
                                                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Receipt className="h-3.5 w-3.5" /> Facturar</>}
                                                </Button>
                                                <Hint label="Marcar como facturado y registrar la(s) FEV" side="top">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 rounded-lg text-[10px] font-semibold gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                                        onClick={() => setInvoiceDialog({
                                                            id: order.id!, number: order.number, initial: order.invoice_numbers ?? [], mode: 'mark',
                                                        })}
                                                        disabled={busy}
                                                    >
                                                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><BadgeCheck className="h-3.5 w-3.5" /> Facturado</>}
                                                    </Button>
                                                </Hint>
                                            </>
                                        )}
                                        {order.status === 'ACCEPTED' && (
                                            <>
                                                <Hint label={order.invoice_numbers?.length ? "Editar facturas registradas" : "Registrar número de factura"} side="top">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 rounded-lg text-[10px] font-semibold gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                                        onClick={() => setInvoiceDialog({
                                                            id: order.id!, number: order.number, initial: order.invoice_numbers ?? [], mode: 'edit',
                                                        })}
                                                        disabled={busy}
                                                    >
                                                        <Receipt className="h-3.5 w-3.5" />
                                                        {order.invoice_numbers?.length ? 'Facturas' : 'Registrar FEV'}
                                                    </Button>
                                                </Hint>
                                                <Hint label="Marcar como NO facturado" side="top">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-amber-600"
                                                        onClick={() => handleUnmarkInvoiced(order.id!)}
                                                        disabled={busy}
                                                    >
                                                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                                                    </Button>
                                                </Hint>
                                            </>
                                        )}
                                        <Hint label="Ver detalle" side="left">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600" asChild>
                                                <Link href={`/documents/${order.id}`}>
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </Hint>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400">
                        Página <span className="font-semibold text-slate-600">{page}</span> de {totalPages}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <Hint label="Página anterior" side="top">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg"
                                disabled={page <= 1}
                                onClick={() => goToPage(page - 1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        </Hint>
                        <Hint label="Página siguiente" side="top">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg"
                                disabled={page >= totalPages}
                                onClick={() => goToPage(page + 1)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </Hint>
                    </div>
                </div>
            )}
            {ConfirmDialogEl}

            <InvoiceNumbersDialog
                open={invoiceDialog !== null}
                orderNumber={invoiceDialog?.number}
                initial={invoiceDialog?.initial}
                mode={invoiceDialog?.mode}
                busy={processingId === invoiceDialog?.id}
                onCancel={() => setInvoiceDialog(null)}
                onConfirm={handleInvoiceDialogConfirm}
            />
        </div>
    )
}
