"use client"

import { useState } from "react"
import { Document } from "@/features/documents/types"
import { Button } from "@/shared/components/ui/button"
import {
    ShoppingCart,
    Receipt,
    Loader2,
    Search,
    Eye,
    Clock,
    Send,
    CheckCircle2,
    XCircle,
    Plus,
    Calendar,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/shared/lib/utils"
import { convertDocumentAction } from "../convertActions"
import { toast } from "sonner"

interface SalesOrderListProps {
    orders: Document[]
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

export function SalesOrderList({ orders }: SalesOrderListProps) {
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")

    const filteredOrders = orders.filter(order =>
        order.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.party?.legal_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleConvertToInvoice = async (docId: string) => {
        if (!confirm("¿Deseas convertir este pedido en una Factura?")) return
        setProcessingId(docId)
        const result = await convertDocumentAction(docId, 'INVOICE')
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
                    <p className="text-xs text-slate-400 mt-1">No hay pedidos de venta registrados</p>
                </div>
                <Button asChild className="h-9 px-4 rounded-xl bg-indigo-600 text-white text-xs mt-2">
                    <Link href="/sales/orders/new">
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Crear primer pedido
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-0">
            {/* Search Bar */}
            <div className="p-4 border-b border-slate-100">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <input
                        type="text"
                        placeholder="Buscar por número o cliente..."
                        className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-200 focus:border-indigo-300"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {filteredOrders.length === 0 ? (
                <div className="py-16 text-center">
                    <Search className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No se encontraron resultados para &quot;{searchTerm}&quot;</p>
                </div>
            ) : (
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
                            {filteredOrders.map((order) => (
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
                                            {(order.status === 'DRAFT' || order.status === 'SENT') && (
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
            )}
        </div>
    )
}
