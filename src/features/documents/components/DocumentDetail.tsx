"use client"

import { useState } from "react"
import { Document } from "../types"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Badge } from "@/shared/components/ui/badge"
import {
    Loader2,
    Send,
    ArrowLeft,
    Printer,
    CheckCircle2,
    ShieldCheck,
    QrCode,
    Calendar,
    User,
    Hash,
    Receipt,
    ExternalLink,
    LayoutList,
    Package,
    Info,
    FileText,
    ChevronRight,
    ArrowUpRight,
    Link2,
    Copy,
    Check,
    Trash2,
    Warehouse,
    FileDown,
    Pencil,
    Ban,
    EyeOff,
} from "lucide-react"
import { emitDianAction } from '@/features/dian/actions'
import { createPaymentLinkAction } from '@/features/payments/actions'
import { deleteDocumentAction, forceDeleteDocumentAction, voidSalesOrderAction } from '../actions'
import { duplicateSalesOrderAction } from '@/features/sales/convertActions'
import { PrintDeliveryNoteButton } from './PrintDeliveryNoteButton'
import { ViewDeliveryPricesButton } from './ViewDeliveryPricesButton'
import { PrintSalesOrderButton } from './PrintSalesOrderButton'
import { PrintVendorBillButton } from './PrintVendorBillButton'
import { PrintDocSupportButton } from './PrintDocSupportButton'
import { toast } from 'sonner'
import { format } from "date-fns"
import { parseLocalDate } from "@/shared/lib/dateFmt"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { cn } from "@/shared/lib/utils"
import Link from "next/link"
import { documentPdfService } from '../services/documentPdfService'
import type { TenantPdfInfo, DianResolutionPdfInfo } from '../services/documentPdfService'
import { useConfirm } from "@/shared/hooks/useConfirm"
import { DocumentAttachmentsSection } from "./DocumentAttachmentsSection"
import { FinalNotesCard } from "./FinalNotesCard"
import { Hint } from "@/shared/components/ui/hint"

interface DocumentDetailProps {
    document: Document;
    relatedDocuments?: {
        parent: { id: string; number: string; doc_type: string } | null;
        children: { id: string; number: string; doc_type: string }[];
    };
    tenantInfo?: TenantPdfInfo | null;
    dianResolution?: DianResolutionPdfInfo | null;
    /** Cantidad ya enviada por product_id (para % enviado/pendiente en pedidos). */
    shippedByProduct?: Record<string, number>;
}

/** Extrae la tasa de IVA (%) desde el tax_config de una línea (array u objeto). */
function ivaRateOf(taxConfig: unknown): number {
    if (Array.isArray(taxConfig)) {
        const iva = taxConfig.find(
            (t) => t && typeof t === 'object' && ((t as { type?: string }).type === 'IVA' || (t as { name?: string }).name === 'IVA')
        ) ?? taxConfig[0];
        return Number((iva as { rate?: number })?.rate ?? 0);
    }
    if (taxConfig && typeof taxConfig === 'object') {
        return Number((taxConfig as { rate?: number }).rate ?? 0);
    }
    return 0;
}

export function DocumentDetail({ document, relatedDocuments, tenantInfo, dianResolution, shippedByProduct }: DocumentDetailProps) {
    const router = useRouter();
    const [ConfirmDialogEl, confirmFn] = useConfirm();
    const [processing, setProcessing] = useState(false);
    const [creatingLink, setCreatingLink] = useState(false);

    // Base para el % de participación de cada ítem (suma sin IVA).
    const lineBaseSum =
        document.lines?.reduce((s, l) => s + Number(l.qty) * Number(l.unit_price), 0) || 0;
    // El seguimiento de enviado/pendiente por línea aplica a pedidos de venta.
    const showFulfillment = document.doc_type === 'SALES_ORDER';
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleEmit = async () => {
        const ok = await confirmFn({ title: "Confirmar", description: "¿Confirmar emisión oficial a la DIAN? Esta acción generará el XML legal y el CUFE.", variant: "danger", confirmLabel: "Confirmar" })
        if (!ok) return;

        setProcessing(true);
        const result = await emitDianAction(document.id!);
        setProcessing(false);

        if ('error' in result) {
            alert(`Error en la emisión: ${result.error}`);
        } else {
            router.refresh();
        }
    };

    const handleDelete = async () => {
        if (!document.id) return;
        const ok = await confirmFn({
            title: "Eliminar documento",
            description: `Se borrará permanentemente el borrador #${document.number}. Esta acción no se puede deshacer.`,
            variant: "danger",
            confirmLabel: "Eliminar",
        });
        if (!ok) return;

        setProcessing(true);
        const result = await deleteDocumentAction(document.id);

        // Si el error es por documentos hijos vinculados, ofrecer desvincular y borrar
        if (result.error && result.error.includes('documento(s) vinculado(s)')) {
            setProcessing(false);
            const forceOk = await confirmFn({
                title: "Hay documentos vinculados",
                description: `${result.error}\n\n¿Quieres desvincular esos documentos (quedarán independientes) y eliminar este documento igual?`,
                variant: "danger",
                confirmLabel: "Desvincular y eliminar",
            });
            if (!forceOk) return;

            setProcessing(true);
            const forceResult = await forceDeleteDocumentAction(document.id);
            setProcessing(false);

            if (forceResult.error) {
                toast.error(forceResult.error);
                return;
            }
            toast.success(
                forceResult.unlinked && forceResult.unlinked > 0
                    ? `Documento eliminado. ${forceResult.unlinked} vínculo(s) desvinculado(s).`
                    : 'Documento eliminado'
            );
            router.push('/sales/invoices');
            return;
        }

        setProcessing(false);
        if (result.error) {
            toast.error(result.error);
            return;
        }
        toast.success('Documento eliminado');
        router.push('/sales/invoices');
    };

    const handleVoid = async () => {
        if (!document.id) return;
        const ok = await confirmFn({
            title: "Anular pedido",
            description: `El pedido #${document.number} quedará ANULADO y conservará su número (no se elimina, para no saltar el consecutivo). Si necesitas volver a subirlo con cambios, usa "Duplicar" antes de anular. Esta acción no se puede deshacer.`,
            variant: "danger",
            confirmLabel: "Anular pedido",
        });
        if (!ok) return;

        setProcessing(true);
        const result = await voidSalesOrderAction(document.id);
        setProcessing(false);

        if (result.error) {
            toast.error(result.error);
            return;
        }
        toast.success('Pedido anulado');
        router.refresh();
    };

    const handleDuplicate = async () => {
        if (!document.id) return;
        const ok = await confirmFn({
            title: "Duplicar pedido",
            description: `Se creará un NUEVO pedido en borrador con los mismos ítems del #${document.number}, para que lo ajustes y lo vuelvas a confirmar. El pedido actual no se modifica.`,
            confirmLabel: "Duplicar",
        });
        if (!ok) return;

        setProcessing(true);
        const result = await duplicateSalesOrderAction(document.id);
        // Si tuvo éxito, la acción redirige al nuevo borrador (no regresa aquí).
        setProcessing(false);
        if (result?.error) toast.error(result.error);
    };

    const handleCreatePaymentLink = async () => {
        if (!document.id) return;
        setCreatingLink(true);
        const result = await createPaymentLinkAction(document.id);
        setCreatingLink(false);

        if ('error' in result) {
            alert(`Error al crear link de pago: ${result.error}`);
            return;
        }

        setPaymentUrl(result.url);
        // Copiar al portapapeles automáticamente
        try {
            await navigator.clipboard.writeText(result.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch {
            // Portapapeles no disponible en contexto no-HTTPS — mostrar URL igualmente
        }
    };

    const handleCopyUrl = async () => {
        if (!paymentUrl) return;
        try {
            await navigator.clipboard.writeText(paymentUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch {
            // silencioso
        }
    };

    const isSent = document.status === 'SENT';
    const isDraft = document.status === 'DRAFT';
    const isInvoice = document.doc_type === 'INVOICE';
    const isDeliveryNote = document.doc_type === 'DELIVERY_NOTE';
    const isSalesOrder = document.doc_type === 'SALES_ORDER';
    const isPurchaseDoc = document.doc_type === 'PURCHASE_ORDER' || document.doc_type === 'VENDOR_BILL';
    const isVendorBill = document.doc_type === 'VENDOR_BILL';
    const isDocSupport = document.doc_type === 'DOC_SUPPORT';
    // Pedido en estado final (facturado): habilita las observaciones finales.
    const isFinalSalesOrder = isSalesOrder && document.status === 'ACCEPTED';
    const balance = Number(document.balance ?? document.total ?? 0);
    // 'PAID' no está en el enum TypeScript actual pero puede existir en DB
    const canCreatePaymentLink = isInvoice && balance > 0 && (document.status as string) !== 'PAID';

    const docTypeLabel: Record<string, string> = {
        'INVOICE': 'Factura de Venta',
        'CREDIT_NOTE': 'Nota Crédito',
        'DEBIT_NOTE': 'Nota Débito',
        'PAYROLL': 'Nómina',
        'PAYROLL_ADJUST': 'Ajuste Nómina',
        'DOC_SUPPORT': 'Doc. Soporte',
        'RECEIPT': 'Recibo de Caja',
        'QUOTATION': 'Cotización',
        'SALES_ORDER': 'Pedido de Venta',
        'DELIVERY_NOTE': 'Remisión',
        'PURCHASE_ORDER': 'Orden de Compra',
        'VENDOR_BILL': 'Factura de Compra',
    };

    const formatCurrency = (val: any) => {
        const num = Number(val);
        if (isNaN(num)) return '$0';
        return `$${num.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {ConfirmDialogEl}
            {/* 🔗 TRAZABILIDAD (LINEAGE) */}
            {(relatedDocuments?.parent || (relatedDocuments?.children && relatedDocuments.children.length > 0)) && (
                <div className="flex flex-wrap items-center gap-4 px-1 pb-2 overflow-x-auto no-scrollbar">
                    {relatedDocuments.parent && (
                        <Link href={`/documents/${relatedDocuments.parent.id}`} className="shrink-0">
                            <div className="flex items-center gap-3 bg-white/50 border border-slate-100 px-4 py-2 rounded-2xl hover:bg-white hover:border-indigo-200 transition-all group">
                                <ArrowLeft className="h-3 w-3 text-slate-400 group-hover:text-indigo-500" />
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Origen</span>
                                    <span className="text-[10px] font-black text-slate-700 italic">{docTypeLabel[relatedDocuments.parent.doc_type] || relatedDocuments.parent.doc_type} #{relatedDocuments.parent.number}</span>
                                </div>
                            </div>
                        </Link>
                    )}

                    {relatedDocuments?.parent && relatedDocuments.children.length > 0 && <ChevronRight className="h-4 w-4 text-slate-200" />}

                    {relatedDocuments?.children.map(child => (
                        <Link key={child.id} href={`/documents/${child.id}`} className="shrink-0">
                            <div className="flex items-center gap-3 bg-white/50 border border-slate-100 px-4 py-2 rounded-2xl hover:bg-white hover:border-emerald-200 transition-all group">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Destino</span>
                                    <span className="text-[10px] font-black text-slate-700 italic">{docTypeLabel[child.doc_type] || child.doc_type} #{child.number}</span>
                                </div>
                                <ArrowUpRight className="h-3 w-3 text-slate-400 group-hover:text-emerald-500" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* 💎 PREMIUM HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
                <div className="flex items-center gap-6">
                    <Hint label="Volver" side="top">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => router.back()}
                            className="h-14 w-14 rounded-2xl border-none bg-white shadow-premium hover:scale-105 transition-all text-slate-400 hover:text-slate-900"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Hint>
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                                <FileText className="h-5 w-5" />
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight italic">
                                {docTypeLabel[document.doc_type] || document.doc_type}
                            </h1>
                            <Badge variant="outline" className="h-7 border-none bg-slate-100 text-slate-500 font-black px-4 text-[10px] tracking-widest uppercase">
                                #{document.number}
                            </Badge>
                        </div>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 pl-[52px]">
                            <Calendar className="h-3 w-3 text-indigo-500" />
                            {document.issue_date ? format(parseLocalDate(document.issue_date)!, 'PPP', { locale: es }) : '-'}
                        </p>
                        {/* Facturas (FEV) registradas para el pedido facturado */}
                        {isSalesOrder && document.invoice_numbers && document.invoice_numbers.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap pl-[52px] pt-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    {document.invoice_numbers.length > 1 ? 'Facturas' : 'Factura'}
                                </span>
                                {document.invoice_numbers.map((inv) => (
                                    <span key={inv} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 rounded-lg px-2.5 py-1 text-[11px] font-black font-mono">
                                        <Receipt className="h-3 w-3" />
                                        {inv}
                                    </span>
                                ))}
                            </div>
                        )}
                        {document.expected_delivery_date && (
                            <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 pl-[52px]">
                                <Calendar className="h-3 w-3 text-emerald-500" />
                                Entrega estimada: {format(parseLocalDate(document.expected_delivery_date)!, 'PPP', { locale: es })}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-start md:justify-end gap-3">
                    {/* Botones de impresión para tipos específicos */}
                    {isDeliveryNote && <PrintDeliveryNoteButton docId={document.id!} />}
                    {isDeliveryNote && <ViewDeliveryPricesButton docId={document.id!} />}
                    {isSalesOrder && <PrintSalesOrderButton docId={document.id!} />}
                    {isVendorBill && <PrintVendorBillButton docId={document.id!} />}
                    {isDocSupport && <PrintDocSupportButton docId={document.id!} />}

                    {/* Botón PDF — disponible para todos los tipos */}
                    <Button
                        variant="outline"
                        onClick={() => documentPdfService.generatePdf(document, tenantInfo, dianResolution)}
                        className="h-11 rounded-xl border-slate-100 bg-white shadow-sm px-4 font-black text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest"
                    >
                        <FileDown className="mr-3 h-4 w-4" /> PDF
                    </Button>

                    {isDraft && (
                        <Button
                            variant="outline"
                            asChild
                            className="h-11 rounded-xl border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 font-black px-4 shadow-sm transition-all hover:scale-105 active:scale-95 text-[10px] uppercase tracking-widest"
                        >
                            <Link href={`/documents/${document.id}/edit`}>
                                <Pencil className="mr-3 h-4 w-4" /> Editar
                            </Link>
                        </Button>
                    )}

                    {/* Borrar: para todos los documentos EXCEPTO pedidos de venta.
                        Los pedidos no se borran (saltaría el consecutivo) — se anulan. */}
                    {isDraft && !isSalesOrder && (
                        <Button
                            variant="outline"
                            onClick={handleDelete}
                            disabled={processing}
                            className="h-11 rounded-xl border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black px-4 shadow-sm transition-all hover:scale-105 active:scale-95 text-[10px] uppercase tracking-widest"
                        >
                            {processing ? <Loader2 className="mr-3 h-4 w-4 animate-spin" /> : <Trash2 className="mr-3 h-4 w-4" />}
                            Eliminar
                        </Button>
                    )}

                    {/* Duplicar: crea un borrador nuevo con los mismos ítems (re-subir fácil). */}
                    {isSalesOrder && (
                        <Button
                            variant="outline"
                            onClick={handleDuplicate}
                            disabled={processing}
                            className="h-11 rounded-xl border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 font-black px-4 shadow-sm transition-all hover:scale-105 active:scale-95 text-[10px] uppercase tracking-widest"
                        >
                            {processing ? <Loader2 className="mr-3 h-4 w-4 animate-spin" /> : <Copy className="mr-3 h-4 w-4" />}
                            Duplicar
                        </Button>
                    )}

                    {/* Anular: pedidos de venta en borrador o confirmado. Conserva el número. */}
                    {isSalesOrder && (isDraft || isSent) && (
                        <Button
                            variant="outline"
                            onClick={handleVoid}
                            disabled={processing}
                            className="h-11 rounded-xl border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black px-4 shadow-sm transition-all hover:scale-105 active:scale-95 text-[10px] uppercase tracking-widest"
                        >
                            {processing ? <Loader2 className="mr-3 h-4 w-4 animate-spin" /> : <Ban className="mr-3 h-4 w-4" />}
                            Anular
                        </Button>
                    )}

                    {/* Facturar desde remisión */}
                    {isDeliveryNote && isDraft && (
                        <Button
                            onClick={async () => {
                                const ok = await confirmFn({
                                    title: "Facturar esta remisión",
                                    description: "Se creará una factura de venta basada en los ítems despachados en esta remisión.",
                                    variant: "warning",
                                    confirmLabel: "Crear factura",
                                });
                                if (!ok) return;
                                setProcessing(true);
                                const { convertDocumentAction } = await import('@/features/sales/convertActions');
                                const res = await convertDocumentAction(document.id!, 'INVOICE');
                                setProcessing(false);
                                if (res?.error) toast.error(res.error);
                            }}
                            disabled={processing}
                            className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 shadow-lg transition-all hover:scale-105 active:scale-95 text-[10px] uppercase tracking-widest"
                        >
                            {processing ? <Loader2 className="mr-3 h-4 w-4 animate-spin" /> : <Receipt className="mr-3 h-4 w-4" />}
                            Facturar
                        </Button>
                    )}

                    {/* Emitir DIAN — solo para documentos fiscales, NO para remisiones */}
                    {isDraft && !isDeliveryNote && (
                        <Button
                            onClick={handleEmit}
                            disabled={processing}
                            className="h-11 rounded-xl bg-slate-900 hover:bg-primary text-white font-black px-4 shadow-lg transition-all hover:scale-105 active:scale-95 text-[10px] uppercase tracking-widest"
                        >
                            {processing ? <Loader2 className="mr-3 h-4 w-4 animate-spin" /> : <Send className="mr-3 h-4 w-4" />}
                            Emitir DIAN
                        </Button>
                    )}

                    {canCreatePaymentLink && !paymentUrl && (
                        <Button
                            onClick={handleCreatePaymentLink}
                            disabled={creatingLink}
                            variant="outline"
                            className="h-11 rounded-xl border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black px-4 shadow-sm transition-all hover:scale-105 active:scale-95 text-[10px] uppercase tracking-widest"
                        >
                            {creatingLink
                                ? <Loader2 className="mr-3 h-4 w-4 animate-spin" />
                                : <Link2 className="mr-3 h-4 w-4" />
                            }
                            Link de Pago
                        </Button>
                    )}

                    {canCreatePaymentLink && paymentUrl && (
                        <div className="flex items-center gap-2 h-14 bg-emerald-50 border border-emerald-200 rounded-[1.25rem] px-4">
                            <a
                                href={paymentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-black text-emerald-700 uppercase tracking-widest hover:underline max-w-[140px] truncate"
                            >
                                Ver Link
                            </a>
                            <Hint label="Copiar URL" side="top">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleCopyUrl}
                                    className="h-8 w-8 rounded-xl text-emerald-600 hover:bg-emerald-100"
                                >
                                    {copied
                                        ? <Check className="h-4 w-4 text-emerald-500" />
                                        : <Copy className="h-4 w-4" />
                                    }
                                </Button>
                            </Hint>
                        </div>
                    )}

                    {isSent && document.doc_type === 'PURCHASE_ORDER' && !relatedDocuments?.children.some(c => c.doc_type === 'VENDOR_BILL') && (
                        <Button
                            asChild
                            className="h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-black px-4 shadow-lg transition-all hover:scale-105 active:scale-95 text-[10px] uppercase tracking-widest border-none"
                        >
                            <Link href={`/purchasing/bills/new?orderId=${document.id}`}>
                                <Receipt className="mr-3 h-4 w-4" /> Registrar Factura
                            </Link>
                        </Button>
                    )}

                    <Badge className={cn(
                        "h-11 px-4 rounded-xl font-black text-[10px] tracking-widest border-none shadow-sm uppercase flex items-center",
                        isSent ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                    )}>
                        {isSent ? '✓ ACEPTADO' : 'BORRADOR'}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
                {/* Main Content (Left) */}
                <div className="lg:col-span-8 space-y-10">
                    {/* 📦 DETALLE LÍNEAS */}
                    <Card className="bg-white border-none shadow-premium rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="py-8 px-10 border-b border-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <Package className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Detalle de Conceptos</CardTitle>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">Productos & Servicios Facturados</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                            <Table className="min-w-[880px]">
                                <TableHeader>
                                    <TableRow className="border-slate-50 hover:bg-transparent">
                                        <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] pl-10 py-5">Concepto</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] text-center py-5">IVA</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] text-right py-5">P. Unit.</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] text-right py-5">P.U. + IVA</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] text-center py-5">Cant.</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] text-center py-5">Desc.</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] text-right py-5">Total (sin IVA)</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] text-center py-5">% Part.</TableHead>
                                        {showFulfillment && (
                                            <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] text-center pr-10 py-5">Enviado / Pend.</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {document.lines?.map((line) => {
                                        const qty = Number(line.qty);
                                        const unit = Number(line.unit_price);
                                        const iva = ivaRateOf(line.tax_config);
                                        const totalSinIva = qty * unit;
                                        const partPct = lineBaseSum > 0 ? (totalSinIva / lineBaseSum) * 100 : 0;
                                        const shipped = line.product_id ? (shippedByProduct?.[line.product_id] ?? 0) : 0;
                                        const enviadoPct = qty > 0 ? Math.min(100, (shipped / qty) * 100) : 0;
                                        const pendiente = Math.max(0, qty - shipped);
                                        return (
                                        <TableRow key={line.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                            <TableCell className="py-6 pl-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-white transition-all group-hover:shadow-sm shrink-0">
                                                        <Package className="h-5 w-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-black text-slate-900">{line.description}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">SKU: {line.product_id?.substring(0, 8) || 'GENÉRICO'}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center text-xs font-bold text-slate-500">{iva}%</TableCell>
                                            <TableCell className="text-right text-sm font-bold text-slate-500">{formatCurrency(unit)}</TableCell>
                                            <TableCell className="text-right text-sm font-bold text-slate-400">{formatCurrency(unit * (1 + iva / 100))}</TableCell>
                                            <TableCell className="text-center text-sm font-black text-slate-600">{qty}</TableCell>
                                            <TableCell className="text-center text-xs font-bold text-slate-300">—</TableCell>
                                            <TableCell className="text-right text-sm font-black text-slate-900">{formatCurrency(totalSinIva)}</TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-xs font-black text-indigo-600 tabular-nums">{partPct.toFixed(1)}%</span>
                                            </TableCell>
                                            {showFulfillment && (
                                                <TableCell className="pr-10 py-4">
                                                    {line.product_id ? (
                                                        <div className="space-y-1 min-w-[110px]">
                                                            <div className="flex items-center justify-between text-[10px] font-bold">
                                                                <span className={cn(enviadoPct >= 100 ? 'text-emerald-600' : 'text-slate-500')}>
                                                                    {enviadoPct.toFixed(0)}% env.
                                                                </span>
                                                                <span className={cn(pendiente > 0 ? 'text-amber-600' : 'text-slate-300')}>
                                                                    {pendiente > 0 ? `${pendiente} pend.` : 'completo'}
                                                                </span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className={cn('h-full rounded-full transition-all', enviadoPct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500')}
                                                                    style={{ width: `${enviadoPct}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[10px] text-slate-300 text-center">—</p>
                                                    )}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 👤 PARTES + 💰 RESUMEN */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                        {/* Cliente */}
                        <Card className="bg-white border-none shadow-premium rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="pb-4 px-8 pt-8">
                                <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <User className="h-3.5 w-3.5 text-indigo-500" /> {isPurchaseDoc ? 'Proveedor' : 'Cliente / Pagador'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 px-8 pb-8">
                                <div className="space-y-1">
                                    <h4 className="text-2xl font-black text-slate-900 leading-tight italic tracking-tight">{document.party?.legal_name}</h4>
                                    <Badge variant="outline" className="bg-slate-50 border-none text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {document.party?.doc_type} {document.party?.doc_number}
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-1 gap-3 text-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300">
                                            <Send className="h-4 w-4" />
                                        </div>
                                        <span className="text-slate-500 font-bold text-xs">{document.party?.email || 'Sin correo registrado'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300">
                                            <Receipt className="h-4 w-4" />
                                        </div>
                                        <span className="text-slate-500 font-bold text-xs">{document.party?.phone || 'Sin teléfono'}</span>
                                    </div>
                                    {document.warehouse && (
                                        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                                            <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                                <Warehouse className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bodega de origen</p>
                                                <p className="text-slate-700 font-black text-sm italic">{document.warehouse.name}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Resumen Facturación */}
                        <Card className="bg-white shadow-premium overflow-hidden relative rounded-[2.5rem] border-none">
                            <div className="h-1.5 bg-gradient-to-r from-indigo-400 to-primary" />
                            <CardHeader className="relative z-10 px-8 pt-8 pb-4">
                                <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    Resumen Facturación
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 relative z-10 px-8 pb-8">
                                <div className="flex justify-between items-center text-sm font-bold text-slate-400">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(document.subtotal)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-bold text-slate-400">
                                    <span>
                                        IVA
                                        {document.subtotal && Number(document.subtotal) > 0
                                            ? ` ${Math.round((Number(document.taxes ?? 0) / Number(document.subtotal)) * 100)}%`
                                            : ''}
                                    </span>
                                    <span>{formatCurrency(document.taxes)}</span>
                                </div>
                                <div className="h-px bg-slate-100 my-4" />
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total a Pagar</span>
                                    <h3 className="text-4xl font-black tracking-tighter italic text-slate-900">{formatCurrency(document.total)}</h3>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ✅ OBSERVACIONES FINALES — solo pedidos ya cerrados (facturados) */}
                    {isFinalSalesOrder && (
                        <FinalNotesCard
                            documentId={document.id!}
                            value={document.final_notes}
                            updatedAt={document.final_notes_at}
                        />
                    )}
                </div>

                {/* Sidebar - Certification (Right) */}
                <div className="lg:col-span-4 space-y-10">
                    {isSent ? (
                        <Card className="bg-emerald-50/50 border-none shadow-premium relative overflow-hidden group rounded-[2.5rem]">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                                <ShieldCheck className="h-32 w-32 text-emerald-600 rotate-12" />
                            </div>

                            <CardContent className="space-y-8 pt-8 px-8 pb-8">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-2xl bg-white shadow-premium flex items-center justify-center text-emerald-600">
                                        <ShieldCheck className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-emerald-900 tracking-tight italic">Certificación DIAN</h4>
                                        <div className="flex items-center gap-1.5 text-emerald-600/80 text-[10px] font-black uppercase tracking-widest">
                                            <CheckCircle2 className="h-3 w-3" /> Aceptado Oficialmente
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-emerald-600/10" />

                                {document.electronic_document?.cufe && (
                                    <div className="space-y-3">
                                        <span className="text-[10px] font-black text-emerald-900/40 uppercase tracking-[0.2em]">
                                            CUFE (Código Único)
                                        </span>
                                        <div className="p-5 bg-white rounded-2xl shadow-sm font-mono text-[9px] text-emerald-900/60 break-all leading-relaxed">
                                            {document.electronic_document.cufe}
                                        </div>
                                    </div>
                                )}

                                {document.electronic_document?.qr_data && (
                                    <div className="space-y-4 pt-4">
                                        <div className="bg-white p-4 rounded-3xl flex items-center justify-center border-8 border-emerald-100/50 shadow-lg mx-auto w-fit">
                                            <QrCode className="h-24 w-24 text-slate-900 opacity-20" />
                                        </div>
                                        <Button variant="ghost" className="w-full h-12 rounded-2xl text-emerald-700 font-black text-[10px] uppercase tracking-widest bg-white shadow-sm hover:bg-white hover:shadow-premium transition-all" asChild>
                                            <a href={document.electronic_document.xml_url || '#'} target="_blank" rel="noopener noreferrer">
                                                Validar en DIAN <ExternalLink className="h-3 w-3 ml-2" />
                                            </a>
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="bg-white border-none shadow-premium rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="px-8 pt-8 pb-4">
                                <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Info className="h-3.5 w-3.5 text-indigo-500" /> Estado del Trámite
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 px-8 pb-8">
                                <p className="text-sm font-medium text-slate-400 leading-relaxed">
                                    Este documento aún no tiene validez legal tributaria. Debe ser emitido oficialmente ante la DIAN.
                                </p>
                                <div className="bg-slate-50 p-8 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center gap-3 text-center">
                                    <Receipt className="h-10 w-10 text-slate-200" />
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Esperando Registro Electrónico</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* 📝 NOTAS */}
                    <Card className="bg-white border-none shadow-premium rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="px-8 pt-8 pb-4">
                            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <LayoutList className="h-3.5 w-3.5 text-indigo-500" /> Comentarios Globales
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8 space-y-4">
                            <p className="text-sm font-medium text-slate-400 italic leading-relaxed">
                                {document.notes_public || "Sin notas adicionales registradas para este documento."}
                            </p>

                            {/* Comentarios internos: visibles en el sistema, NO se imprimen */}
                            {document.notes_internal && (
                                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3">
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.15em] flex items-center gap-1.5 mb-1.5">
                                        <EyeOff className="h-3 w-3" /> Comentarios internos · no se imprimen
                                    </p>
                                    <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                                        {document.notes_internal}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* 📎 ADJUNTOS POR DEPARTAMENTO */}
            {document.id && document.tenant_id && (
                <DocumentAttachmentsSection
                    documentId={document.id}
                    tenantId={document.tenant_id}
                />
            )}
        </div>
    )
}
