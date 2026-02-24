"use client"

import { useState } from "react"
import { Document } from "@/features/documents/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { format } from "date-fns"
import { Button } from "@/shared/components/ui/button"
import {
    FileCheck,
    Eye,
    Receipt,
    Calendar,
    ArrowUpRight,
    Search,
    ShieldCheck,
    Banknote,
    Activity,
    ArrowRight,
    CheckCircle2,
    Clock,
    AlertCircle,
    Filter,
    Download,
    Loader2
} from "lucide-react"
import Link from "next/link"
import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent } from "@/shared/components/ui/card"
import { cn } from "@/shared/lib/utils"
import { IndustrialApprovalFlow } from "./IndustrialApprovalFlow"
import { approveVendorBillAction } from "../actions"
import { useToast } from "@/shared/hooks/use-toast"
import { useRouter } from "next/navigation"

interface VendorBillListProps {
    bills: Document[]
}

export function VendorBillList({ bills }: VendorBillListProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
    const { toast } = useToast();
    const router = useRouter();

    const handleApprove = async (id: string) => {
        setApprovingIds(prev => new Set(prev).add(id));
        const result = await approveVendorBillAction(id);

        if (result.success) {
            toast({
                title: "AUDITORÍA EXITOSA",
                description: "La factura ha sido validada y contabilizada correctamente.",
                variant: "default",
            });
            router.refresh();
        } else {
            toast({
                title: "ERROR DE AUDITORÍA",
                description: result.error || "No se pudo aprobar la factura.",
                variant: "destructive",
            });
        }
        setApprovingIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    const filteredBills = bills.filter(bill =>
        bill.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.party?.legal_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'DRAFT': 'border-slate-200 text-slate-500 bg-slate-50',
            'SENT': 'border-indigo-200 text-indigo-600 bg-indigo-50/50',
            'ACCEPTED': 'border-emerald-200 text-emerald-600 bg-emerald-50/50',
            'CANCELLED': 'border-rose-200 text-rose-600 bg-rose-50/50',
        };
        const labels: Record<string, string> = {
            'DRAFT': 'PENDIENTE AUDITORÍA',
            'SENT': 'CONTABILIZADA / DEUDA',
            'ACCEPTED': 'PASIVO SALDADO',
            'CANCELLED': 'ANULADA',
        };

        const Icon = status === 'DRAFT' ? Clock : status === 'ACCEPTED' ? CheckCircle2 : status === 'SENT' ? Banknote : AlertCircle;

        return (
            <Badge variant="outline" className={cn("border-[1.5px] px-5 py-2 font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-3 rounded-full shadow-active italic leading-none whitespace-nowrap", styles[status] || '')}>
                <div className="h-2 w-2 rounded-full bg-current animate-pulse shadow-[0_0_8px_currentColor]" />
                <Icon className="h-4 w-4" />
                {labels[status] || status}
            </Badge>
        )
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* 🛠️ ENHANCED SEARCH TOOLBAR V3 */}
            <div className="flex flex-col lg:flex-row gap-8 justify-between items-center bg-white p-10 rounded-[3.5rem] shadow-premium border border-slate-50 relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-12 opacity-[0.02] pointer-events-none group-hover:scale-125 group-hover:rotate-12 transition-all duration-[2000ms]">
                    <Search className="h-24 w-24 text-slate-900" />
                </div>

                <div className="relative w-full lg:w-[600px] z-10 group/input">
                    <div className="absolute left-8 top-1/2 -translate-y-1/2 h-10 w-10 bg-slate-100 rounded-2xl flex items-center justify-center group-hover/input:bg-emerald-500 group-hover/input:text-white group-hover/input:rotate-12 transition-all duration-500 shadow-inner">
                        <Search className="h-5 w-5 opacity-40 group-hover/input:opacity-100 transition-opacity" />
                    </div>
                    <input
                        type="text"
                        placeholder="BUSCAR FACTURA O PROVEEDOR..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] h-20 pl-24 pr-10 text-[11px] font-black uppercase tracking-[0.4em] text-slate-950 focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/20 transition-all placeholder:text-slate-300 shadow-inner group-hover/input:border-slate-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-6 z-10 w-full lg:w-auto">
                    <Button variant="outline" className="h-16 flex-1 lg:flex-none px-10 rounded-2xl border-slate-100 bg-white text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] hover:bg-slate-950 hover:text-white hover:border-slate-950 transition-all shadow-premium italic group/btn">
                        <Filter className="h-4 w-4 mr-4 group-hover/btn:rotate-180 transition-transform" /> ESTADO PAGO
                    </Button>
                    <Button variant="outline" className="h-16 flex-1 lg:flex-none px-10 rounded-2xl border-slate-100 bg-white text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] hover:bg-slate-950 hover:text-white hover:border-slate-950 transition-all shadow-premium italic group/btn">
                        <Download className="h-4 w-4 mr-4 group-hover/btn:translate-y-1 transition-transform" /> AUDITORÍA
                    </Button>
                </div>
            </div>

            {/* 🧾 INDUSTRIAL FINANCIAL TABLE V3 */}
            <Card className="border-none shadow-premium bg-white rounded-[4rem] overflow-hidden p-3 relative">
                <div className="absolute top-0 right-0 p-12 opacity-[0.01] pointer-events-none">
                    <ShieldCheck className="h-64 w-64" />
                </div>

                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-50 hover:bg-transparent">
                                <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] pl-14 py-12 italic">
                                    <div className="flex items-center gap-4">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_theme(colors.emerald.500)]" />
                                        PROVEEDOR / ORIGEN
                                    </div>
                                </TableHead>
                                <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] py-12 italic text-center">FLUJO DE AUDITORÍA</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] py-12 text-right italic">OBLIGACIÓN TOTAL</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] py-12 text-right pr-14 italic">ACCIONES</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBills.length === 0 ? (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={5} className="py-40 text-center">
                                        <div className="flex flex-col items-center gap-10">
                                            <div className="h-32 w-32 bg-slate-50 rounded-[3rem] flex items-center justify-center shadow-inner text-slate-200 border border-slate-100 animate-pulse">
                                                <FileCheck className="h-14 w-14" />
                                            </div>
                                            <div className="space-y-4">
                                                <p className="text-slate-900 font-black text-4xl tracking-tighter italic uppercase leading-none">Cero Obligaciones</p>
                                                <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.6em] italic">FLUJO FINANCIERO ÍNTEGRO • NO HAY FACTURAS REGISTRADAS</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredBills.map((bill) => (
                                    <TableRow key={bill.id} className="border-slate-50 hover:bg-slate-50/50 transition-all group/row relative overflow-hidden">
                                        <TableCell className="py-10 pl-14">
                                            <div className="flex items-center gap-8">
                                                <div className="h-16 w-16 rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-slate-300 group-hover/row:bg-white group-hover/row:shadow-premium group-hover/row:rotate-6 transition-all duration-500 shadow-inner group-hover/row:text-primary border border-transparent group-hover/row:border-slate-100">
                                                    <Receipt className="h-8 w-8" />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-xl font-black text-slate-950 tracking-tighter uppercase italic leading-none group-hover/row:text-primary transition-colors truncate w-72">{bill.party?.legal_name || 'ORIGEN DESCONOCIDO'}</span>
                                                    <div className="flex items-center gap-4 mt-1">
                                                        <Badge variant="outline" className="bg-slate-50 border-none text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full group-hover/row:bg-white group-hover/row:shadow-sm transition-all italic text-slate-400">FOLIO: {bill.number}</Badge>
                                                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">REG. FISCAL V3.2</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-10">
                                            <div className="flex flex-col items-center gap-6">
                                                <IndustrialApprovalFlow currentStatus={bill.status} className="scale-75 origin-top" />
                                                <div className="flex items-center gap-2 mt-[-1rem]">
                                                    <Calendar className="h-3 w-3 text-slate-300" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Vence: {bill.due_date || bill.issue_date}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-10 text-right">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-4xl font-black text-slate-950 font-mono tracking-tighter italic leading-none group-hover/row:scale-110 origin-right transition-transform duration-500 drop-shadow-sm">
                                                    ${bill.total.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                                                </span>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] italic">COP / OBLIGACIÓN FISCAL</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-10 text-right pr-14">
                                            <div className="flex items-center justify-end gap-5">
                                                {bill.status === 'DRAFT' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => bill.id && handleApprove(bill.id)}
                                                        disabled={approvingIds.has(bill.id || '')}
                                                        className="h-12 px-8 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 font-black text-[9px] uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all shadow-sm active:scale-95 group/approve"
                                                    >
                                                        {approvingIds.has(bill.id || '') ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <ShieldCheck className="h-4 w-4 mr-2 group-hover/approve:rotate-12 transition-transform" />
                                                                VALIDAR AUDITORÍA
                                                            </>
                                                        )}
                                                    </Button>
                                                )}

                                                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl bg-slate-50 text-slate-400 hover:text-primary hover:bg-white hover:shadow-premium transition-all active:scale-90 border border-transparent hover:border-slate-100" asChild title="Ver Detalle">
                                                    <Link href={`/documents/${bill.id}`}>
                                                        <Eye className="h-7 w-7" />
                                                    </Link>
                                                </Button>

                                                {bill.status === 'SENT' && (
                                                    <Button variant="ghost" size="icon" className="h-14 w-14 rounded-[1.2rem] bg-indigo-50/50 text-indigo-400 hover:text-indigo-600 hover:bg-white hover:shadow-premium transition-all active:scale-90 border border-transparent hover:border-indigo-100" asChild title="Programar Pago">
                                                        <Link href={`/treasury/payments/new?billId=${bill.id}`}>
                                                            <ArrowUpRight className="h-7 w-7" />
                                                        </Link>
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
