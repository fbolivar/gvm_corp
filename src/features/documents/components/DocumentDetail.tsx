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
    Trash2
} from "lucide-react"
import { emitDianAction } from '@/features/dian/actions'
import { createPaymentLinkAction } from '@/features/payments/actions'
import { deleteDocumentAction, forceDeleteDocumentAction } from '../actions'
import { toast } from 'sonner'
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { cn } from "@/shared/lib/utils"
import Link from "next/link"
import { documentPdfService } from '../services/documentPdfService'
import type { TenantPdfInfo, DianResolutionPdfInfo } from '../services/documentPdfService'
import { useConfirm } from "@/shared/hooks/useConfirm"

interface DocumentDetailProps {
    document: Document;
    relatedDocuments?: {
        parent: { id: string; number: string; doc_type: string } | null;
        children: { id: string; number: string; doc_type: string }[];
    };
    tenantInfo?: TenantPdfInfo | null;
    dianResolution?: DianResolutionPdfInfo | null;
}

export function DocumentDetail({ document, relatedDocuments, tenantInfo, dianResolution }: DocumentDetailProps) {
    const router = useRouter();
    const [ConfirmDialogEl, confirmFn] = useConfirm();
    const [processing, setProcessing] = useState(false);
    const [creatingLink, setCreatingLink] = useState(false);
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
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.back()}
                        className="h-14 w-14 rounded-2xl border-none bg-white shadow-premium hover:scale-105 transition-all text-slate-400 hover:text-slate-900"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
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
                            {document.issue_date ? format(new Date(document.issue_date), 'PPP', { locale: es }) : '-'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {isDeliveryNote ? (
                        <Button
                            asChild
                            variant="outline"
                            className="h-14 rounded-[1.25rem] border-slate-100 bg-white shadow-sm px-8 font-black text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest"
                        >
                            <Link href={`/print/delivery-note?id=${document.id}`} target="_blank">
                                <Printer className="mr-3 h-4 w-4" /> Imprimir remisión
                            </Link>
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            onClick={() => documentPdfService.generatePdf(document, tenantInfo, dianResolution)}
                            className="h-14 rounded-[1.25rem] border-slate-100 bg-white shadow-sm px-8 font-black text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all text-[10px] uppercase tracking-widest"
                        >
                            <Printer className="mr-3 h-4 w-4" /> Descargar PDF
                        </Button>
                    )}

                    {isDraft && (
                        <Button
                            variant="outline"
                            onClick={handleDelete}
                            disabled={processing}
                            className="h-14 rounded-[1.25rem] border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black px-8 shadow-sm transition-all hover:scale-105 active:scale-95 text-[10px] uppercase tracking-widest"
                        >
                            {processing ? <Loader2 className="mr-3 h-4 w-4 animate-spin" /> : <Trash2 className="mr-3 h-4 w-4" />}
                            Eliminar
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
                            className="h-14 rounded-[1.25rem] bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 shadow-lg transition-all hover:scale-105 active:scale-95 text-[10px] uppercase tracking-widest"
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
                            className="h-14 rounded-[1.25rem] bg-slate-900 hover:bg-primary text-white font-black px-8 shadow-lg transition-all hover:scale-105 active:scale-95 text-[10px] uppercase tracking-widest"
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
                            className="h-14 rounded-[1.25rem] border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black px-8 shadow-sm transition-all hover:scale-105 active:scale-95 text-[10px] uppercase tracking-widest"
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
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={handleCopyUrl}
                                className="h-8 w-8 rounded-xl text-emerald-600 hover:bg-emerald-100"
                                title="Copiar URL"
                            >
                                {copied
                                    ? <Check className="h-4 w-4 text-emerald-500" />
                                    : <Copy className="h-4 w-4" />
                                }
                            </Button>
                        </div>
                    )}

                    {isSent && document.doc_type === 'PURCHASE_ORDER' && !relatedDocuments?.children.some(c => c.doc_type === 'VENDOR_BILL') && (
                        <Button
                            asChild
                            className="h-14 rounded-[1.25rem] bg-amber-500 hover:bg-amber-600 text-slate-900 font-black px-8 shadow-lg transition-all hover:scale-105 active:scale-95 text-[10px] uppercase tracking-widest border-none"
                        >
                            <Link href={`/purchasing/bills/new?orderId=${document.id}`}>
                                <Receipt className="mr-3 h-4 w-4" /> Registrar Factura
                            </Link>
                        </Button>
                    )}

                    <Badge className={cn(
                        "h-14 px-8 rounded-[1.25rem] font-black text-[10px] tracking-widest border-none shadow-sm uppercase flex items-center",
                        isSent ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                    )}>
                        {isSent ? '✓ ACEPTADO' : 'BORRADOR'}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
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
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-50 hover:bg-transparent">
                                        <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] pl-10 py-5">Concepto</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] text-center py-5">Cant.</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] text-right py-5">Unitario</TableHead>
                                        <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] text-right pr-10 py-5">Subtotal</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {document.lines?.map((line) => (
                                        <TableRow key={line.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                            <TableCell className="py-6 pl-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-white transition-all group-hover:shadow-sm">
                                                        <Package className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-slate-900">{line.description}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">SKU: {line.product_id?.substring(0, 8) || 'GENÉRICO'}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center text-sm font-black text-slate-600">{line.qty}</TableCell>
                                            <TableCell className="text-right text-sm font-bold text-slate-500">{formatCurrency(line.unit_price)}</TableCell>
                                            <TableCell className="text-right pr-10 text-sm font-black text-slate-900">
                                                {formatCurrency(line.qty * line.unit_price)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* 👤 PARTES + 💰 RESUMEN */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Cliente */}
                        <Card className="bg-white border-none shadow-premium rounded-[2.5rem] overflow-hidden">
                            <CardHeader className="pb-4 px-8 pt-8">
                                <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <User className="h-3.5 w-3.5 text-indigo-500" /> Cliente / Pagador
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
                        <CardContent className="px-8 pb-8">
                            <p className="text-sm font-medium text-slate-400 italic leading-relaxed">
                                {document.notes_public || "Sin notas adicionales registradas para este documento."}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
