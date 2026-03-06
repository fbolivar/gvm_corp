"use client"

import { useState } from "react"
import { Document } from "@/features/documents/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Button } from "@/shared/components/ui/button"
import {
    ShoppingCart,
    Receipt,
    Loader2,
    Search,
    Eye,
} from "lucide-react"
import Link from "next/link"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"
import { convertDocumentAction } from "../convertActions"
import { toast } from "sonner"

interface SalesOrderListProps {
    orders: Document[]
}

const STATUS_STYLES: Record<string, string> = {
    DRAFT: 'bg-slate-50 text-slate-600 border-slate-200',
    SENT: 'bg-blue-50 text-blue-600 border-blue-200',
    ACCEPTED: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    CANCELLED: 'bg-rose-50 text-rose-600 border-rose-200',
}

const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'En Espera',
    SENT: 'Despachado',
    ACCEPTED: 'Facturado',
    CANCELLED: 'Anulado',
}

export function SalesOrderList({ orders }: SalesOrderListProps) {
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredOrders = orders.filter(order =>
        order.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.party?.legal_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleConvertToInvoice = async (docId: string) => {
        if (!confirm("¿Deseas convertir este pedido en una Factura?")) return;
        setProcessingId(docId);
        const result = await convertDocumentAction(docId, 'INVOICE');
        setProcessingId(null);
        if (result?.error) toast.error(result.error);
    };

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
                    <ShoppingCart className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Sin pedidos registrados</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-b border-slate-100">
                                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3 pl-4">Cliente</TableHead>
                                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3 text-center">Estado</TableHead>
                                <TableHead className="hidden md:table-cell text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3 text-center">Fecha</TableHead>
                                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3 text-right">Total</TableHead>
                                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3 text-right pr-4">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrders.map((order) => (
                                <TableRow key={order.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="py-3 pl-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                                                <ShoppingCart className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {order.party?.legal_name || 'Consumidor Final'}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-slate-400 font-medium">#{order.number}</span>
                                                    <span className="text-[10px] text-slate-400">{order.issue_date}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-3 text-center">
                                        <Badge variant="outline" className={cn(
                                            "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                                            STATUS_STYLES[order.status] || ''
                                        )}>
                                            {STATUS_LABELS[order.status] || order.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell py-3 text-center">
                                        <span className="text-xs text-slate-600 font-medium">
                                            {order.issue_date}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-3 text-right">
                                        <span className="text-sm font-bold text-slate-900">
                                            ${order.total.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-3 text-right pr-4">
                                        <div className="flex items-center justify-end gap-1.5">
                                            {order.status === 'DRAFT' && (
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
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
