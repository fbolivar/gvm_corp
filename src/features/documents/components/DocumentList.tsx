"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
    FileText,
    Loader2,
    Send,
    ShoppingCart,
    Receipt,
    ArrowUpRight,
    Eye,
    Truck,
    FileBadge,
    FileCheck,
    FileInput,
    FileOutput,
    ClipboardList,
} from "lucide-react"
import Link from "next/link"

import { Document } from "../types"
import { emitDianAction } from "@/features/dian/actions"
import { convertDocumentAction } from "@/features/sales/convertActions"
import { DataTable, DataTableColumn } from "@/shared/components/ui/data-table"
import { StatusBadge, statusToTone } from "@/shared/components/ui/status-badge"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { useConfirm } from "@/shared/hooks/useConfirm"

// ── Doc-type metadata ────────────────────────────────────────────────────────

interface DocTypeMeta {
    label: string
    icon: React.ElementType
    colorClass: string
}

const DOC_TYPE_META: Record<string, DocTypeMeta> = {
    QUOTATION:      { label: "Cotización",     icon: ClipboardList, colorClass: "bg-amber-50 text-amber-600" },
    SALES_ORDER:    { label: "Pedido Venta",   icon: ShoppingCart,  colorClass: "bg-emerald-50 text-emerald-600" },
    INVOICE:        { label: "Factura Venta",  icon: FileCheck,     colorClass: "bg-blue-50 text-blue-600" },
    PURCHASE_ORDER: { label: "Orden Compra",   icon: FileInput,     colorClass: "bg-violet-50 text-violet-600" },
    VENDOR_BILL:    { label: "Factura Compra", icon: FileOutput,    colorClass: "bg-rose-50 text-rose-600" },
    CREDIT_NOTE:    { label: "Nota Crédito",   icon: FileBadge,     colorClass: "bg-teal-50 text-teal-600" },
    DEBIT_NOTE:     { label: "Nota Débito",    icon: FileBadge,     colorClass: "bg-orange-50 text-orange-600" },
    DOC_SUPPORT:    { label: "Doc. Soporte",   icon: FileText,      colorClass: "bg-sky-50 text-sky-600" },
    RECEIPT:        { label: "Recibo",         icon: Receipt,       colorClass: "bg-indigo-50 text-indigo-600" },
}

function DocTypeBadge({ type }: { type: string }) {
    const meta = DOC_TYPE_META[type]
    if (!meta) {
        return (
            <Badge variant="outline" className="border-none px-3 font-bold text-[10px] uppercase tracking-tight">
                {type}
            </Badge>
        )
    }
    const Icon = meta.icon
    return (
        <Badge
            variant="outline"
            className={cn(
                "border-none px-3 font-bold text-[10px] uppercase tracking-tight inline-flex items-center gap-1",
                meta.colorClass,
            )}
        >
            <Icon className="h-3 w-3" />
            {meta.label}
        </Badge>
    )
}

// ── Status labels ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
    DRAFT:    "Borrador",
    SIGNED:   "Firmado",
    SENT:     "Enviado",
    ACCEPTED: "Aceptado",
    REJECTED: "Rechazado",
    VOIDED:   "Anulado",
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface DocumentListProps {
    documents: Document[]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DocumentList({ documents }: DocumentListProps) {
    const router = useRouter()
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [ConfirmDialogEl, confirmFn] = useConfirm()

    // ── Action handlers ────────────────────────────────────────────────────────

    const handleEmit = async (docId: string) => {
        const ok = await confirmFn({
            title: "Confirmar",
            description: "¿Confirmar emisión a la DIAN (Simulación)?",
            variant: "warning",
            confirmLabel: "Confirmar",
        })
        if (!ok) return
        setProcessingId(docId)
        const result = await emitDianAction(docId)
        setProcessingId(null)
        if ("error" in result) alert(`Error: ${result.error}`)
    }

    const handleConvert = async (docId: string, targetType: string) => {
        const label = targetType === "SALES_ORDER" ? "PEDIDO" : "FACTURA"
        const ok = await confirmFn({
            title: "Confirmar",
            description: `¿Convertir este documento a ${label}?`,
            variant: "warning",
            confirmLabel: "Confirmar",
        })
        if (!ok) return
        setProcessingId(docId)
        const result = await convertDocumentAction(docId, targetType as Parameters<typeof convertDocumentAction>[1])
        setProcessingId(null)
        if (result?.error) alert(`Error: ${result.error}`)
    }

    const handleReceive = async (docId: string) => {
        const ok = await confirmFn({
            title: "Confirmar",
            description: "¿Registrar entrada de mercancía para esta Orden de Compra?",
            variant: "warning",
            confirmLabel: "Confirmar",
        })
        if (!ok) return
        setProcessingId(docId)
        const { markAsReceivedAction } = await import("@/features/purchasing/actions")
        const result = await markAsReceivedAction(docId)
        setProcessingId(null)
        if (result?.error) alert(result.error)
    }

    // ── Column definitions ─────────────────────────────────────────────────────

    const columns: DataTableColumn<Document>[] = [
        {
            key: "doc_type",
            header: "Tipo",
            align: "left",
            width: "160px",
            accessor: (row) => <DocTypeBadge type={row.doc_type} />,
        },
        {
            key: "number",
            header: "Número",
            align: "left",
            width: "140px",
            sortValue: (row) => row.number ?? "",
            accessor: (row) => (
                <span className="text-sm font-black text-slate-900 tracking-tight">
                    {row.number ?? "Draft"}
                </span>
            ),
        },
        {
            key: "party",
            header: "Tercero",
            align: "left",
            sortValue: (row) => row.party?.legal_name ?? "",
            accessor: (row) => (
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <FileText className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">
                        {row.party?.legal_name ?? "Consumidor Final"}
                    </span>
                </div>
            ),
        },
        {
            key: "issue_date",
            header: "Fecha",
            align: "left",
            width: "130px",
            sortValue: (row) => (row.issue_date ? new Date(row.issue_date) : null),
            accessor: (row) => (
                <span className="text-xs font-medium text-slate-500">
                    {row.issue_date ? format(new Date(row.issue_date), "MMM dd, yyyy") : "-"}
                </span>
            ),
        },
        {
            key: "total",
            header: "Total",
            align: "right",
            width: "130px",
            sortValue: (row) => row.total,
            accessor: (row) => (
                <span className="text-sm font-black text-slate-900 tabular-nums">
                    ${row.total.toLocaleString("es-CO", { minimumFractionDigits: 0 })}
                </span>
            ),
        },
        {
            key: "status",
            header: "Estado",
            align: "center",
            width: "120px",
            sortValue: (row) => row.status,
            accessor: (row) => (
                <StatusBadge tone={statusToTone(row.status)} dot>
                    {STATUS_LABELS[row.status] ?? row.status}
                </StatusBadge>
            ),
        },
        {
            key: "actions",
            header: "Acciones",
            align: "right",
            width: "220px",
            accessor: (row) => {
                const isProcessing = processingId === row.id
                return (
                    <div
                        className="flex items-center justify-end gap-1"
                        // Prevent row-level navigation when clicking action buttons
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Cotización DRAFT → Pedido */}
                        {row.doc_type === "QUOTATION" && row.status === "DRAFT" && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg border-emerald-100 text-emerald-600 text-[10px] font-bold hover:bg-emerald-50"
                                onClick={() => row.id && handleConvert(row.id, "SALES_ORDER")}
                                disabled={isProcessing}
                            >
                                <ShoppingCart className="h-3 w-3 mr-1" /> Pedido
                            </Button>
                        )}

                        {/* Pedido Venta DRAFT → Factura */}
                        {row.doc_type === "SALES_ORDER" && row.status === "DRAFT" && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg border-blue-100 text-blue-600 text-[10px] font-bold hover:bg-blue-50"
                                onClick={() => row.id && handleConvert(row.id, "INVOICE")}
                                disabled={isProcessing}
                            >
                                <Receipt className="h-3 w-3 mr-1" /> Facturar
                            </Button>
                        )}

                        {/* Orden Compra DRAFT → Recibir + Facturar */}
                        {row.doc_type === "PURCHASE_ORDER" && row.status === "DRAFT" && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-lg border-amber-100 text-amber-600 text-[10px] font-bold hover:bg-amber-50"
                                    onClick={() => row.id && handleReceive(row.id)}
                                    disabled={isProcessing}
                                >
                                    <Truck className="h-3 w-3 mr-1" /> Recibir
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 rounded-lg border-rose-100 text-rose-600 text-[10px] font-bold hover:bg-rose-50"
                                    onClick={() => row.id && handleConvert(row.id, "VENDOR_BILL")}
                                    disabled={isProcessing}
                                >
                                    <ArrowUpRight className="h-3 w-3 mr-1" /> Facturar
                                </Button>
                            </>
                        )}

                        {/* Facturas / NC / Doc. Soporte DRAFT → Emitir DIAN */}
                        {["INVOICE", "CREDIT_NOTE", "DOC_SUPPORT"].includes(row.doc_type) &&
                            row.status === "DRAFT" && (
                                <Button
                                    size="sm"
                                    className="h-8 rounded-lg bg-primary text-white text-[10px] font-bold hover:bg-primary/90 shadow-sm"
                                    onClick={() => row.id && handleEmit(row.id)}
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <Send className="h-3 w-3 mr-1" />
                                    )}
                                    Emitir
                                </Button>
                            )}

                        {/* Ver detalle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors"
                            asChild
                        >
                            <Link href={`/documents/${row.id}`}>
                                <Eye className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                )
            },
        },
    ]

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <>
            <DataTable<Document>
                data={documents}
                columns={columns}
                rowKey={(row) => row.id ?? Math.random().toString()}
                onRowClick={(row) => router.push(`/documents/${row.id}`)}
                empty={{
                    icon: FileText,
                    title: "Sin documentos",
                    description: "No hay registros históricos para mostrar.",
                }}
                className="border-none shadow-premium rounded-[2.5rem]"
            />
            {ConfirmDialogEl}
        </>
    )
}
