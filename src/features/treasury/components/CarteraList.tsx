"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { format, differenceInDays } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/shared/components/ui/button"
import {
    FileText,
    ArrowRight,
    AlertCircle,
    Clock,
    CheckCircle2,
    Filter,
    ArrowUpRight,
    Search,
    Target,
    Activity,
    TrendingUp,
    Zap,
    Download
} from "lucide-react"
import Link from "next/link"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"
import { Card, CardContent } from "@/shared/components/ui/card"

interface CarteraItem {
    id: string
    number: string
    doc_type: string
    party_name: string
    issue_date: string
    due_date?: string
    total: number
    balance: number
    status: string
}

interface CarteraListProps {
    items: CarteraItem[]
    type: 'RECEIVABLES' | 'PAYABLES'
    tenant?: any
}

import { pdfReportService } from "@/features/accounting/services/pdfReportService"

export function CarteraList({ items, type, tenant }: CarteraListProps) {
    const [searchTerm, setSearchTerm] = useState("");

    const handleDownloadReport = async () => {
        const options = {
            title: `REPORTE DE CARTERA - ${type === 'RECEIVABLES' ? 'CLIENTES' : 'PROVEEDORES'}`,
            companyName: tenant?.name || 'GVM CORP SAS',
            companyNit: tenant?.nit,
            companyAddress: tenant?.address,
            companyPhone: tenant?.phone,
            logoUrl: tenant?.logo_url,
            period: format(new Date(), 'MMMM yyyy', { locale: es }).toUpperCase()
        };

        // We can reuse generateFinancialStatement or create a specific one for list. 
        // For simplicity, let's use generateAuxiliaryLedger mapping the data or just use a basic one.
        // Actually, I'll use generateFinancialStatement structure.

        const sections = [{
            title: type === 'RECEIVABLES' ? 'CUENTAS POR COBRAR' : 'CUENTAS POR PAGAR',
            rows: filteredItems.map(i => ({
                code: i.number,
                name: i.party_name,
                balance: i.balance
            })),
            total: filteredItems.reduce((sum, i) => sum + i.balance, 0)
        }];

        await pdfReportService.generateFinancialStatement(sections, options);
    };

    const filteredItems = items.filter(item =>
        item.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.party_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (item: CarteraItem) => {
        const daysOverdue = item.due_date ? differenceInDays(new Date(), new Date(item.due_date)) : 0;
        const totalDays = item.due_date ? differenceInDays(new Date(item.due_date), new Date(item.issue_date)) : 30; // Default 30 days
        const progress = Math.min(Math.max((daysOverdue / 30) * 100, 0), 100); // 30 days overdue is 100% critical

        if (item.balance <= 0) return (
            <div className="flex flex-col items-center gap-2 w-full max-w-[120px]">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-none rounded-full font-black text-[9px] uppercase tracking-[0.3em] px-4 py-1.5 shadow-sm italic gap-2 w-full justify-center">
                    <CheckCircle2 className="h-3 w-3" /> SALDADO
                </Badge>
                <div className="w-full h-1 bg-emerald-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-full" />
                </div>
            </div>
        );

        if (daysOverdue > 0) return (
            <div className="flex flex-col items-center gap-2 w-full max-w-[120px]">
                <Badge variant="outline" className={cn(
                    "border-none rounded-full font-black text-[9px] uppercase tracking-[0.3em] px-4 py-1.5 shadow-sm italic gap-2 w-full justify-center",
                    daysOverdue > 15 ? "bg-rose-500/10 text-rose-600 animate-pulse" : "bg-orange-500/10 text-orange-600"
                )}>
                    <AlertCircle className="h-3 w-3" /> {daysOverdue > 15 ? "CRÍTICO" : "VENCIDO"} {daysOverdue}D
                </Badge>
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn("h-full", daysOverdue > 15 ? "bg-rose-500" : "bg-orange-500")} style={{ width: `${Math.max(10, progress)}%` }} />
                </div>
            </div>
        );

        // Vigente
        const daysLeft = item.due_date ? differenceInDays(new Date(item.due_date), new Date()) : 0;
        const progressLeft = Math.min(Math.max(((totalDays - daysLeft) / totalDays) * 100, 0), 100);

        return (
            <div className="flex flex-col items-center gap-2 w-full max-w-[120px]">
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-none rounded-full font-black text-[9px] uppercase tracking-[0.3em] px-4 py-1.5 shadow-sm italic gap-2 w-full justify-center">
                    <Clock className="h-3 w-3" /> PUNTUAL
                </Badge>
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${Math.max(5, progressLeft)}%` }} />
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-1000">

            {/* 🛠️ ENHANCED TOOLBAR */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-premium border border-slate-50 relative overflow-hidden group">
                {/* Decorative Icon */}
                <div className="absolute right-0 top-0 p-4 opacity-[0.02] pointer-events-none">
                    <Search className="h-16 w-16" />
                </div>

                <div className="relative w-full md:w-[500px] z-10">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por referencia o tercero comercial..."
                        className="w-full bg-slate-50 border-none rounded-2xl h-14 pl-14 pr-6 text-xs font-black uppercase tracking-widest text-slate-900 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-300 shadow-inner"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-4 z-10 w-full md:w-auto">
                    <Button variant="outline" className="h-14 flex-1 md:flex-none px-6 rounded-2xl border-slate-100 bg-white text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:text-slate-900 transition-all">
                        <Filter className="h-4 w-4 mr-3" /> Parámetros
                    </Button>
                    <Button
                        className="h-14 flex-1 md:flex-none px-8 rounded-2xl bg-slate-900 hover:bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-active hover:scale-105 active:scale-95 transition-all"
                        onClick={handleDownloadReport}
                    >
                        <Download className="h-4 w-4 mr-3" /> Reporte Fiscal
                    </Button>
                </div>
            </div>

            {/* 📜 INDUSTRIAL CARTERA LIST */}
            <div className="relative rounded-[3.5rem] border-none bg-white shadow-premium overflow-hidden border border-slate-100/50">
                {/* Background Decorator */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                    <Activity className="h-48 w-48 text-slate-900" />
                </div>

                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-slate-50 hover:bg-transparent">
                            <TableHead className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 pl-14 py-10 italic">Secuencia / Protocolo</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 py-10 italic">Tercero Asociado</TableHead>
                            <TableHead className="hidden md:table-cell text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 py-10 italic text-center">Vencimiento Fiscal</TableHead>
                            <TableHead className="hidden md:table-cell text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 py-10 italic text-center">Estado Crítico</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 py-10 italic text-right">Saldo en Mora</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 py-10 pr-14 italic">Gestión</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredItems.length === 0 ? (
                            <TableRow className="hover:bg-transparent border-none">
                                <TableCell colSpan={6} className="py-40 text-center">
                                    <div className="flex flex-col items-center gap-8">
                                        <div className="h-24 w-24 rounded-[2.5rem] bg-slate-50 flex items-center justify-center text-slate-200 shadow-inner group-hover:rotate-12 transition-transform duration-700">
                                            <FileText className="h-12 w-12" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-slate-900 font-black text-2xl tracking-tighter italic uppercase">Auditoría en Cero</h3>
                                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">No se detectaron obligaciones pendientes de {type === 'RECEIVABLES' ? 'cobro' : 'pago'}.</p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredItems.map((item) => (
                                <TableRow key={item.id} className="border-slate-50 hover:bg-slate-50/80 transition-all duration-500 group">
                                    <TableCell className="py-10 pl-14">
                                        <div className="flex items-center gap-6">
                                            <div className="h-14 w-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-premium group-hover:rotate-6 group-hover:scale-110 transition-all duration-700">
                                                <FileText className="h-6 w-6" />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xl font-black text-slate-900 font-mono tracking-tighter italic leading-none group-hover:text-primary transition-colors">{item.number}</span>
                                                <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.3em] leading-none">{item.doc_type}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-10">
                                        <span className="text-base font-black text-slate-700 tracking-tight leading-none group-hover:text-slate-900 transition-colors uppercase italic">{item.party_name}</span>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell py-10">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <span className="text-xs font-black text-slate-900 font-mono tracking-tighter uppercase whitespace-nowrap">
                                                {item.due_date ? format(new Date(item.due_date), 'dd MMM yyyy', { locale: es }).toUpperCase() : '-'}
                                            </span>
                                            <span className="text-[8px] text-slate-300 font-black uppercase tracking-widest italic truncate">Emitido: {format(new Date(item.issue_date), 'dd/MM/yyyy')}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell py-10 text-center">
                                        <div className="flex justify-center">
                                            {getStatusBadge(item)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-10 text-right">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-2xl font-black text-slate-900 font-mono tracking-tighter italic leading-none group-hover:text-primary transition-colors duration-500">
                                                ${item.balance.toLocaleString('es-CO')}
                                            </span>
                                            <span className="text-[9px] text-slate-300 font-black uppercase tracking-tighter line-through opacity-80">${item.total.toLocaleString('es-CO')}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-10 text-right pr-14">
                                        <div className="flex items-center justify-end gap-3">
                                            <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-none bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white shadow-sm transition-all duration-500 hover:scale-110 active:scale-90 group/action" asChild title="Registrar Transacción">
                                                <Link href={`/treasury/new?type=${type === 'RECEIVABLES' ? 'RECEIPT' : 'PAYMENT'}&invoice_id=${item.id}`}>
                                                    <ArrowUpRight className="h-6 w-6 group-hover/action:rotate-45 transition-transform" />
                                                </Link>
                                            </Button>
                                            <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-none bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white shadow-sm transition-all duration-500 hover:scale-110 active:scale-90 group/view" asChild title="Ver Documento">
                                                <Link href={`/documents/${item.id}`}>
                                                    <ArrowRight className="h-6 w-6" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* 📊 FOOTER METRICS - "Nodos de Resumen" */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <Card className="rounded-[3rem] bg-white border-none shadow-premium p-8 group hover:translate-y-[-8px] transition-all duration-700 overflow-hidden relative border border-slate-50">
                    <div className="absolute right-0 top-0 p-8 opacity-[0.02] pointer-events-none group-hover:scale-110 transition-transform">
                        <Target className="h-20 w-20 text-slate-900" />
                    </div>
                    <CardContent className="p-0 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm group-hover:rotate-6 transition-transform">
                                <Zap className="h-6 w-6" />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Exposición Total en {type === 'RECEIVABLES' ? 'Cobro' : 'Deuda'}</p>
                        </div>
                        <div className="text-4xl font-black text-slate-900 font-mono tracking-tighter italic leading-none">
                            ${items.reduce((sum, i) => sum + i.balance, 0).toLocaleString('es-CO')}
                        </div>
                        <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[8px] px-3 py-1 uppercase tracking-widest rounded-full">Balance Operativo</Badge>
                    </CardContent>
                </Card>

                <Card className="rounded-[3rem] bg-white border-none shadow-premium p-8 group hover:translate-y-[-8px] transition-all duration-700 overflow-hidden relative border border-slate-50">
                    <div className="absolute right-0 top-0 p-8 opacity-[0.02] pointer-events-none group-hover:scale-110 transition-transform">
                        <AlertCircle className="h-20 w-20 text-rose-500" />
                    </div>
                    <CardContent className="p-0 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 shadow-sm group-hover:rotate-12 transition-transform">
                                <Activity className="h-6 w-6" />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Capital en Riesgo (Vencido)</p>
                        </div>
                        <div className="text-4xl font-black text-rose-600 font-mono tracking-tighter italic leading-none">
                            ${items.filter(i => (i.due_date ? differenceInDays(new Date(), new Date(i.due_date)) : 0) > 0).reduce((sum, i) => sum + i.balance, 0).toLocaleString('es-CO')}
                        </div>
                        <Badge className="bg-rose-50 text-rose-600 border-none font-black text-[8px] px-3 py-1 uppercase tracking-widest rounded-full">Alerta de Liquidez</Badge>
                    </CardContent>
                </Card>

                <Card className="rounded-[3rem] bg-white border-none shadow-premium p-8 group hover:translate-y-[-8px] transition-all duration-700 overflow-hidden relative border border-slate-50">
                    <div className="absolute right-0 top-0 p-8 opacity-[0.02] pointer-events-none group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-20 w-20 text-emerald-500" />
                    </div>
                    <CardContent className="p-0 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm group-hover:rotate-6 transition-transform">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Eficiencia de Recaudo</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-4xl font-black text-emerald-600 font-mono tracking-tighter italic leading-none">18 Días</div>
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[9px] font-black px-2 py-0.5 rounded-md">-2D</Badge>
                        </div>
                        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest italic group-hover:text-slate-400 transition-colors">Optimización del Ciclo de Caja</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
