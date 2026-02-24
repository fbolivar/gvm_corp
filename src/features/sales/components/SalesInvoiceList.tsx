"use client"

import { useState } from "react"
import { Document } from "@/features/documents/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { format } from "date-fns"
import { Button } from "@/shared/components/ui/button"
import {
    Receipt,
    Send,
    Eye,
    Loader2,
    CheckCircle2,
    ShieldCheck,
    ArrowUpRight,
    Search,
    Cpu,
    Target,
    Zap,
    ScrollText,
    Calendar,
    ArrowRightLeft,
    Filter,
    Download,
    ChevronRight
} from "lucide-react"
import Link from "next/link"
import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent } from "@/shared/components/ui/card"
import { cn } from "@/shared/lib/utils"
import { emitDianAction } from "@/features/dian/actions"

interface SalesInvoiceListProps {
    invoices: Document[]
}

export function SalesInvoiceList({ invoices }: SalesInvoiceListProps) {
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredInvoices = invoices.filter(inv =>
        inv.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.party?.legal_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEmit = async (docId: string) => {
        if (!confirm("¿Deseas emitir legalmente esta factura a la DIAN (Simulación)?")) return;
        setProcessingId(docId);
        const result = await emitDianAction(docId);
        setProcessingId(null);
        if ('error' in result) alert(`Error: ${result.error}`);
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'DRAFT': 'bg-slate-950 text-slate-500 border-slate-800',
            'SENT': 'bg-blue-500/10 text-blue-600 border-blue-200/20',
            'ACCEPTED': 'bg-emerald-500/10 text-emerald-600 border-emerald-200/20',
            'CANCELLED': 'bg-rose-500/10 text-rose-600 border-rose-200/20',
        };
        const labels: Record<string, string> = {
            'DRAFT': 'PROTOCOLO PENDIENTE',
            'SENT': 'EMISIÓN DIAN OK',
            'ACCEPTED': 'VALIDADO CLIENTE',
            'CANCELLED': 'ANULADO',
        };

        const Icon = status === 'DRAFT' ? Receipt : ShieldCheck;

        return (
            <Badge variant="outline" className={cn("border-[1.5px] px-5 py-2 font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-3 rounded-full shadow-active italic leading-none whitespace-nowrap", styles[status] || '')}>
                <div className="h-2 w-2 rounded-full bg-current animate-pulse shadow-[0_0_8px_currentColor]" />
                <Icon className="h-4 w-4" />
                {labels[status] || status}
            </Badge>
        )
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-1000 pb-24">
            {/* 🛠️ INDUSTRIAL SEARCH TOOLBAR */}
            <div className="flex flex-col lg:flex-row gap-8 justify-between items-center bg-white p-10 rounded-[3.5rem] shadow-premium border border-slate-100 relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-10 opacity-[0.03] pointer-events-none transition-transform group-hover:scale-125 group-hover:rotate-12 duration-1000">
                    <Receipt className="h-32 w-32 text-slate-950" />
                </div>

                <div className="relative w-full lg:w-[600px] z-10 group/input">
                    <div className="absolute left-8 top-1/2 -translate-y-1/2 flex items-center gap-4">
                        <Search className="h-6 w-6 text-slate-300 group-focus-within/input:text-primary transition-all duration-500" />
                        <div className="h-6 w-[1.5px] bg-slate-100 group-focus-within/input:bg-primary/20 transition-all duration-500" />
                    </div>
                    <input
                        type="text"
                        placeholder="BUSCAR FACTURA O CLIENTE..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] h-20 pl-24 pr-10 text-[11px] font-black uppercase tracking-[0.4em] text-slate-950 focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/20 transition-all placeholder:text-slate-300 shadow-inner group-hover/input:border-slate-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-6 z-10 w-full lg:w-auto">
                    <Button variant="outline" className="h-20 flex-1 lg:flex-none px-10 rounded-[2rem] border-slate-100 bg-white text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] hover:bg-slate-950 hover:text-white hover:border-slate-950 transition-all shadow-premium group/btn group-hover:translate-y-[-2px]">
                        <Filter className="h-5 w-5 mr-4 text-primary group-hover/btn:rotate-90 transition-transform duration-500" />
                        CANALES DE VENTA
                    </Button>
                    <Button variant="outline" className="h-20 flex-1 lg:flex-none px-10 rounded-[2rem] border-slate-100 bg-white text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] hover:bg-slate-950 hover:text-white hover:border-slate-950 transition-all shadow-premium group/btn group-hover:translate-y-[-2px]">
                        <Download className="h-5 w-5 mr-4 text-blue-500" />
                        REPORTAR CIERRE
                    </Button>
                </div>
            </div>

            {filteredInvoices.length === 0 ? (
                <div className="relative group overflow-hidden text-center py-60 bg-white/50 backdrop-blur-3xl rounded-[4rem] shadow-premium border-2 border-dashed border-slate-100">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-blue-100 to-transparent" />
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="h-32 w-32 rounded-[3.5rem] bg-slate-950 flex items-center justify-center text-primary mx-auto mb-10 shadow-active group-hover:rotate-12 transition-transform duration-1000">
                            <Receipt className="h-16 w-16" />
                        </div>
                        <h3 className="text-slate-950 font-black text-4xl tracking-[0.1em] italic uppercase leading-none mb-6">Sector sin Registros</h3>
                        <p className="text-slate-400 font-black text-[11px] uppercase tracking-[0.6em] max-w-lg mx-auto leading-relaxed">No se detectaron facturas procesadas en la unidad de análisis fiscal.</p>
                    </div>
                </div>
            ) : (
                <div className="relative group overflow-hidden bg-white rounded-[4rem] shadow-premium border border-slate-100 p-3">
                    <div className="absolute top-0 right-0 p-20 opacity-[0.02] pointer-events-none group-hover:scale-125 group-hover:-rotate-12 transition-transform duration-[2000ms]">
                        <ScrollText className="h-96 w-96 text-slate-950" />
                    </div>

                    <div className="overflow-x-auto relative z-10">
                        <Table>
                            <TableHeader className="bg-slate-950 text-white rounded-[3rem] overflow-hidden">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40 pl-14 py-12 italic">Factura / Adquiriente</TableHead>
                                    <TableHead className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40 py-12 italic text-center">Protocolo Fiscal</TableHead>
                                    <TableHead className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40 py-12 italic text-center">Protocolo Temporal</TableHead>
                                    <TableHead className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40 py-12 italic text-right">Métrica de Valor</TableHead>
                                    <TableHead className="text-right text-[11px] font-black uppercase tracking-[0.4em] text-white/40 py-12 pr-14 italic">Gestión de Flujo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInvoices.map((inv) => (
                                    <TableRow key={inv.id} className="border-b border-slate-50 hover:bg-slate-50 transition-all duration-700 group/row">
                                        <TableCell className="py-12 pl-14">
                                            <div className="flex items-center gap-8">
                                                <div className="h-20 w-20 rounded-[2rem] bg-slate-950 flex items-center justify-center text-primary shadow-active group-hover/row:scale-110 group-hover/row:rotate-[10deg] transition-all duration-700 relative overflow-hidden shrink-0">
                                                    <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-white to-transparent" />
                                                    <Receipt className="h-10 w-10 relative z-10" />
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <span className="text-2xl font-black text-slate-950 tracking-tighter italic uppercase leading-none group-hover/row:text-primary transition-colors duration-500 truncate max-w-[300px]">
                                                        {inv.party?.legal_name || 'Consumidor Final'}
                                                    </span>
                                                    <div className="flex items-center gap-4">
                                                        <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-black px-4 py-1 h-6 uppercase tracking-[0.2em] rounded-full shadow-sm italic leading-none whitespace-nowrap">
                                                            #{inv.number}
                                                        </Badge>
                                                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100/50">
                                                            <Calendar className="h-3.5 w-3.5 text-blue-400" />
                                                            <span className="text-[9px] font-black text-blue-600 font-mono tracking-widest leading-none">
                                                                {inv.issue_date}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-12">
                                            <div className="flex justify-center">
                                                {getStatusBadge(inv.status)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-12">
                                            <div className="flex flex-col items-center gap-2.5">
                                                <div className="flex items-center gap-4 px-6 py-3 rounded-[1.5rem] bg-white border border-slate-100 shadow-premium text-slate-900 group-hover/row:border-primary/30 transition-all duration-500 scale-100 group-hover/row:scale-105">
                                                    <Calendar className="h-4 w-4 text-primary" />
                                                    <span className="text-[11px] font-black uppercase tracking-[0.3em] font-mono leading-none">
                                                        {inv.due_date || inv.issue_date}
                                                    </span>
                                                </div>
                                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] italic group-hover/row:text-slate-500 transition-colors">Vencimiento Fiscal</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-12 text-right">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-3xl font-black text-slate-950 tracking-tighter italic leading-none group-hover/row:text-primary transition-colors duration-500">
                                                    ${inv.total.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                                                </span>
                                                <div className="flex items-center justify-end gap-3 opacity-30 group-hover/row:opacity-100 transition-opacity">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic">Balance Activo</span>
                                                    <ShieldCheck className="h-4 w-4 text-emerald-500 animate-pulse" />
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-12 text-right pr-14">
                                            <div className="flex items-center justify-end gap-6">
                                                {inv.status === 'DRAFT' && (
                                                    <Button
                                                        variant="ghost"
                                                        className="h-16 px-10 rounded-[1.5rem] bg-blue-600 text-white text-[11px] font-black uppercase tracking-[0.3em] hover:bg-slate-950 hover:text-white transition-all shadow-active hover:translate-y-[-4px] active:scale-95 group/emit relative overflow-hidden"
                                                        onClick={() => handleEmit(inv.id!)}
                                                        disabled={processingId === inv.id}
                                                    >
                                                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/emit:translate-y-0 transition-transform duration-500" />
                                                        {processingId === inv.id ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : (
                                                            <div className="flex items-center gap-4 relative z-10 font-black">
                                                                <Send className="h-5 w-5" />
                                                                EMITIR DIAN
                                                            </div>
                                                        )}
                                                    </Button>
                                                )}

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-16 w-16 rounded-[1.5rem] bg-slate-100 text-slate-400 hover:bg-slate-950 hover:text-white shadow-premium transition-all duration-700 hover:scale-110 active:scale-90 group/view relative overflow-hidden"
                                                    asChild
                                                >
                                                    <Link href={`/documents/${inv.id}`}>
                                                        <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-primary to-transparent translate-y-full group-hover/view:translate-y-0 transition-transform duration-500" />
                                                        <ArrowUpRight className="h-8 w-8 relative z-10 group-hover/view:translate-x-1 group-hover/view:-translate-y-1 transition-transform" />
                                                    </Link>
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-16 w-16 rounded-[1.5rem] bg-emerald-50 text-emerald-600 hover:bg-slate-950 hover:text-white shadow-premium transition-all duration-700 hover:scale-110 active:scale-90 group/collect relative overflow-hidden"
                                                    asChild
                                                >
                                                    <Link href={`/treasury/collections/new?invoiceId=${inv.id}`}>
                                                        <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-emerald-500 to-transparent translate-y-full group-hover/collect:translate-y-0 transition-transform duration-500" />
                                                        <ArrowRightLeft className="h-8 w-8 relative z-10 group-hover/collect:rotate-45 transition-transform" />
                                                    </Link>
                                                </Button>

                                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all duration-500 hover:bg-primary hover:text-white cursor-pointer group/arrow">
                                                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover/arrow:text-white transition-all" />
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </div>
    )
}
