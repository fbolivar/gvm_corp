"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Document } from "@/features/documents/types"
import { Button } from "@/shared/components/ui/button"
import {
    Receipt,
    Send,
    Loader2,
    Search,
    Eye,
    ArrowRightLeft,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/shared/lib/utils"
import { emitDianAction } from "@/features/dian/actions"
import { toast } from "sonner"
import { useConfirm } from "@/shared/hooks/useConfirm"
import { DataTable, DataTableColumn } from "@/shared/components/ui/data-table"
import { StatusBadge, statusToTone } from "@/shared/components/ui/status-badge"
import { format } from "date-fns"
import { parseLocalDate } from "@/shared/lib/dateFmt"

interface SalesInvoiceListProps {
    invoices: Document[]
}

const STATUS_LABELS: Record<string, string> = {
    DRAFT: "Borrador",
    SENT: "Emitida DIAN",
    ACCEPTED: "Validada",
    CANCELLED: "Anulada",
    SIGNED: "Firmada",
    REJECTED: "Rechazada",
    VOIDED: "Anulada",
}

export function SalesInvoiceList({ invoices }: SalesInvoiceListProps) {
    const router = useRouter()
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [ConfirmDialogEl, confirmFn] = useConfirm()

    const filteredInvoices = invoices.filter((inv) =>
        inv.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.party?.legal_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleEmit = async (docId: string) => {
        const ok = await confirmFn({
            title: "Emitir a la DIAN",
            description: "¿Deseas emitir esta factura a la DIAN (Simulación)?",
            variant: "warning",
            confirmLabel: "Confirmar",
        })
        if (!ok) return
        setProcessingId(docId)
        const result = await emitDianAction(docId)
        setProcessingId(null)
        if ("error" in result) toast.error(String(result.error))
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const columns: DataTableColumn<Document>[] = [
        {
            key: "number",
            header: "Número",
            width: "120px",
            sortValue: (row) => row.number ?? "",
            accessor: (row) => (
                <span className="text-sm font-black text-slate-900 tracking-tight tabular-nums">
                    #{row.number ?? "Borrador"}
                </span>
            ),
        },
        {
            key: "party",
            header: "Cliente",
            sortValue: (row) => row.party?.legal_name ?? "",
            accessor: (row) => (
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                        <Receipt className="h-4 w-4 text-slate-400" />
                    </div>
                    <span className="text-sm font-semibold text-slate-900 truncate max-w-[200px]">
                        {row.party?.legal_name || "Consumidor Final"}
                    </span>
                </div>
            ),
        },
        {
            key: "issue_date",
            header: "Fecha emisión",
            width: "130px",
            sortValue: (row) => parseLocalDate(row.issue_date),
            accessor: (row) => (
                <span className="text-xs font-medium text-slate-500">
                    {row.issue_date ? format(parseLocalDate(row.issue_date)!, "dd MMM yyyy") : "—"}
                </span>
            ),
        },
        {
            key: "due_date",
            header: "Vencimiento",
            width: "130px",
            sortValue: (row) => parseLocalDate(row.due_date),
            accessor: (row) => {
                const due = parseLocalDate(row.due_date)
                const isOverdue = due && due < today && row.status !== "ACCEPTED" && row.status !== "VOIDED"
                return (
                    <span className={cn(
                        "text-xs font-semibold",
                        isOverdue ? "text-rose-600" : "text-slate-500"
                    )}>
                        {due ? format(due, "dd MMM yyyy") : row.issue_date ? format(parseLocalDate(row.issue_date)!, "dd MMM yyyy") : "—"}
                        {isOverdue && (
                            <span className="ml-1 text-[9px] font-black uppercase tracking-wider text-rose-500">
                                Vencida
                            </span>
                        )}
                    </span>
                )
            },
        },
        {
            key: "total",
            header: "Total",
            align: "right",
            width: "130px",
            sortValue: (row) => row.total,
            accessor: (row) => (
                <span className="text-sm font-bold text-slate-900 tabular-nums">
                    ${row.total.toLocaleString("es-CO", { minimumFractionDigits: 0 })}
                </span>
            ),
        },
        {
            key: "status",
            header: "Estado",
            align: "center",
            width: "130px",
            sortValue: (row) => row.status,
            accessor: (row) => (
                <StatusBadge tone={statusToTone(row.status)} dot>
                    {STATUS_LABELS[row.status] ?? row.status}
                </StatusBadge>
            ),
        },
        {
            key: "dian_status",
            header: "DIAN",
            align: "center",
            width: "120px",
            accessor: (row) => {
                const dianStatus = row.electronic_document?.dian_status
                if (!dianStatus) return <span className="text-[10px] text-slate-300">—</span>
                return (
                    <StatusBadge tone={statusToTone(dianStatus)} dot className="text-[10px]">
                        {dianStatus}
                    </StatusBadge>
                )
            },
        },
        {
            key: "actions",
            header: "Acciones",
            align: "right",
            width: "180px",
            accessor: (row) => {
                const isProcessing = processingId === row.id
                return (
                    <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Emitir DIAN — solo para DRAFT */}
                        {row.status === "DRAFT" && (
                            <Button
                                size="sm"
                                className="h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-[10px] font-semibold gap-1.5"
                                onClick={() => row.id && handleEmit(row.id)}
                                disabled={isProcessing}
                            >
                                {isProcessing
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <><Send className="h-3.5 w-3.5" /> Emitir DIAN</>
                                }
                            </Button>
                        )}

                        {/* Ver detalle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            asChild
                        >
                            <Link href={`/documents/${row.id}`}>
                                <Eye className="h-4 w-4" />
                            </Link>
                        </Button>

                        {/* Registrar cobro */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
                            asChild
                        >
                            <Link href={`/treasury/collections/new?invoiceId=${row.id}`}>
                                <ArrowRightLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                )
            },
        },
    ]

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

            {/* DataTable — sin card wrapper propio para que encaje dentro del contenedor padre */}
            <DataTable<Document>
                data={filteredInvoices}
                columns={columns}
                rowKey={(row) => row.id ?? Math.random().toString()}
                onRowClick={(row) => router.push(`/documents/${row.id}`)}
                empty={{
                    icon: Receipt,
                    title: "Sin facturas registradas",
                    description: "No hay facturas que coincidan con los criterios de búsqueda.",
                }}
                className="border-none shadow-none rounded-none"
            />

            {ConfirmDialogEl}
        </div>
    )
}
