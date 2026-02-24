"use client"

import { useState } from "react"
import { emitDianAction } from '@/features/dian/actions';
import { Document } from "../types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { format } from "date-fns"
import { Button } from "@/shared/components/ui/button"
import { Plus, FileText, Loader2, Send, ShoppingCart, Receipt, ArrowUpRight, Eye, ChevronRight, Truck } from "lucide-react"
import Link from "next/link"
import { convertDocumentAction } from "@/features/sales/convertActions"
import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent } from "@/shared/components/ui/card"
import { cn } from "@/shared/lib/utils"

interface DocumentListProps {
    documents: Document[]
}

export function DocumentList({ documents }: DocumentListProps) {
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleEmit = async (docId: string) => {
        if (!confirm("¿Confirmar emisión a la DIAN (Simulación)?")) return;
        setProcessingId(docId);
        const result = await emitDianAction(docId);
        setProcessingId(null);
        if ('error' in result) alert(`Error: ${result.error}`);
    };

    const handleConvert = async (docId: string, targetType: any) => {
        const label = targetType === 'SALES_ORDER' ? 'PEDIDO' : 'FACTURA';
        if (!confirm(`¿Convertir este documento a ${label}?`)) return;

        setProcessingId(docId);
        const result = await convertDocumentAction(docId, targetType);
        setProcessingId(null);
        if (result?.error) alert(`Error: ${result.error}`);
    };

    const getTypeBadge = (type: string) => {
        const styles: Record<string, string> = {
            'QUOTATION': 'bg-amber-50 text-amber-600',
            'SALES_ORDER': 'bg-emerald-50 text-emerald-600',
            'INVOICE': 'bg-blue-50 text-blue-600',
            'PURCHASE_ORDER': 'bg-violet-50 text-violet-600',
            'VENDOR_BILL': 'bg-rose-50 text-rose-600',
        };
        const labels: Record<string, string> = {
            'QUOTATION': 'Cotización',
            'SALES_ORDER': 'Pedido Venta',
            'PURCHASE_ORDER': 'Orden Compra',
            'VENDOR_BILL': 'Factura Compra',
            'INVOICE': 'Factura Venta',
        };
        return <Badge variant="outline" className={cn("border-none px-3 font-bold text-[10px] uppercase tracking-tight", styles[type] || '')}>{labels[type] || type}</Badge>
    };

    return (
        <Card className="border-none shadow-premium overflow-hidden bg-white rounded-[2.5rem]">
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-50 hover:bg-transparent">
                            <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] pl-8 py-5">Número</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] py-5">Tipo</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] py-5">Socio Comercial</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] py-5">Fecha</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] py-5">Estado</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] py-5 text-right">Monto Total</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] py-5 text-right pr-8">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={7} className="py-20 text-center text-slate-300 italic">
                                    No hay registros históricos para mostrar.
                                </TableCell>
                            </TableRow>
                        ) : (
                            documents.map((doc) => (
                                <TableRow key={doc.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                    <TableCell className="py-5 pl-8">
                                        <span className="text-sm font-black text-slate-900 tracking-tight">{doc.number || 'Draft'}</span>
                                    </TableCell>
                                    <TableCell className="py-5">{getTypeBadge(doc.doc_type)}</TableCell>
                                    <TableCell className="py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            <span className="text-xs font-semibold text-slate-700">{doc.party?.legal_name || 'Consumidor Final'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-5 text-xs font-medium text-slate-500">
                                        {doc.issue_date ? format(new Date(doc.issue_date), 'MMM dd, yyyy') : '-'}
                                    </TableCell>
                                    <TableCell className="py-5">
                                        <Badge variant="outline" className={cn(
                                            "border-none px-3 font-bold text-[10px] uppercase",
                                            doc.status === 'DRAFT' ? 'bg-slate-100 text-slate-500' :
                                                doc.status === 'SENT' || doc.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-600' :
                                                    'bg-blue-50 text-blue-600'
                                        )}>
                                            {doc.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-5 text-right">
                                        <span className="text-sm font-black text-slate-900">
                                            ${doc.total.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-5 text-right pr-8 space-x-1">
                                        <div className="flex items-center justify-end gap-1">
                                            {doc.doc_type === 'QUOTATION' && doc.status === 'DRAFT' && (
                                                <Button variant="outline" size="sm" className="h-8 rounded-lg border-emerald-100 text-emerald-600 text-[10px] font-bold hover:bg-emerald-50"
                                                    onClick={() => doc.id && handleConvert(doc.id, 'SALES_ORDER')}
                                                    disabled={processingId === doc.id}
                                                >
                                                    <ShoppingCart className="h-3 w-3 mr-1" /> Pedido
                                                </Button>
                                            )}
                                            {doc.doc_type === 'SALES_ORDER' && doc.status === 'DRAFT' && (
                                                <Button variant="outline" size="sm" className="h-8 rounded-lg border-blue-100 text-blue-600 text-[10px] font-bold hover:bg-blue-50"
                                                    onClick={() => doc.id && handleConvert(doc.id, 'INVOICE')}
                                                    disabled={processingId === doc.id}
                                                >
                                                    <Receipt className="h-3 w-3 mr-1" /> Facturar
                                                </Button>
                                            )}
                                            {doc.doc_type === 'PURCHASE_ORDER' && doc.status === 'DRAFT' && (
                                                <>
                                                    <Button variant="outline" size="sm" className="h-8 rounded-lg border-amber-100 text-amber-600 text-[10px] font-bold hover:bg-amber-50"
                                                        onClick={async () => {
                                                            if (!confirm("¿Registrar entrada de mercancía para esta Orden de Compra?")) return;
                                                            setProcessingId(doc.id!);
                                                            const { markAsReceivedAction } = await import("@/features/purchasing/actions");
                                                            const result = await markAsReceivedAction(doc.id!);
                                                            setProcessingId(null);
                                                            if (result?.error) alert(result.error);
                                                        }}
                                                        disabled={processingId === doc.id}
                                                    >
                                                        <Truck className="h-3 w-3 mr-1" /> Recibir
                                                    </Button>
                                                    <Button variant="outline" size="sm" className="h-8 rounded-lg border-rose-100 text-rose-600 text-[10px] font-bold hover:bg-rose-50"
                                                        onClick={() => doc.id && handleConvert(doc.id, 'VENDOR_BILL')}
                                                        disabled={processingId === doc.id}
                                                    >
                                                        <ArrowUpRight className="h-3 w-3 mr-1" /> Facturar
                                                    </Button>
                                                </>
                                            )}

                                            {['INVOICE', 'CREDIT_NOTE', 'DOC_SUPPORT'].includes(doc.doc_type) && doc.status === 'DRAFT' && (
                                                <Button
                                                    size="sm"
                                                    className="h-8 rounded-lg bg-primary text-white text-[10px] font-bold hover:bg-primary/90 shadow-sm"
                                                    onClick={() => doc.id && handleEmit(doc.id)}
                                                    disabled={processingId === doc.id}
                                                >
                                                    {processingId === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                                                    Emitir
                                                </Button>
                                            )}

                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors" asChild>
                                                <Link href={`/documents/${doc.id}`}>
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
