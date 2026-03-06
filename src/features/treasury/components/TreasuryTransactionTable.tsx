"use client"

import { TreasuryTransaction } from "../types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
    FileText,
    Printer,
    MoreHorizontal,
    ArrowUpCircle,
    ArrowDownCircle,
    Calendar,
    User as UserIcon,
    ShieldCheck,
    Landmark,
    Wallet,
    Info,
    Activity
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/shared/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/shared/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { treasuryService } from "../services/treasuryService"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/shared/components/ui/tooltip"

interface TreasuryTransactionTableProps {
    transactions: any[]
    tenant?: any
}

import { pdfReportService } from "@/features/accounting/services/pdfReportService"

export function TreasuryTransactionTable({ transactions, tenant }: TreasuryTransactionTableProps) {

    const supabase = createClient();
    const router = useRouter();

    const handlePrintVoucher = async (tx: any) => {
        const options = {
            title: tx.transaction_type === 'RECEIPT' ? 'RECIBO DE CAJA' : 'COMPROBANTE DE EGRESO',
            companyName: tenant?.name || 'GVM CORP SAS',
            companyNit: tenant?.nit || '900.000.000-0',
            companyAddress: tenant?.address || 'CALLE 123 # 45-67',
            companyPhone: tenant?.phone || '300 000 0000',
            logoUrl: tenant?.logo_url,
            period: format(new Date(tx.date), 'yyyy')
        };

        await pdfReportService.generateTreasuryVoucher(tx, options);
    };

    const handleVoid = async (txId: string) => {
        if (!confirm("¿Está seguro de anular este movimiento? Esta acción eliminará los registros contables vinculados.")) return;

        try {
            await treasuryService.voidTransaction(supabase, txId);
            toast.success("Movimiento Anulado", {
                description: "Los registros han sido eliminados del sistema."
            });
            router.refresh();
        } catch (error: any) {
            toast.error("Falla en Anulación", {
                description: error.message
            });
        }
    };

    return (
        <div className="bg-white rounded-[2.5rem] shadow-premium overflow-hidden border border-slate-50">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-50 h-16">
                        <TableHead className="pl-8 text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Fecha / Ref</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Tercero / Concepto</TableHead>
                        <TableHead className="hidden md:table-cell text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Nodo Financiero</TableHead>
                        <TableHead className="hidden md:table-cell text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Retenciones</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic text-right">Valor Neto</TableHead>
                        <TableHead className="pr-8 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Control</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-40 text-center italic text-slate-300">
                                No se encontraron movimientos en este periodo.
                            </TableCell>
                        </TableRow>
                    ) : (
                        transactions.map((tx) => {
                            const isIncome = tx.transaction_type === 'RECEIPT';
                            const totalWithholding = tx.withholdings?.reduce((sum: number, w: any) => sum + (Number(w.applied_amount) || 0), 0) || 0;

                            return (
                                <TableRow key={tx.id} className="group hover:bg-slate-50/50 transition-all border-slate-50 h-24">
                                    {/* Date & Reference */}
                                    <TableCell className="pl-8">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3 w-3 text-slate-300" />
                                                <span className="text-sm font-black text-slate-900 italic tracking-tighter uppercase leading-none">
                                                    {format(new Date(tx.date), 'MMM dd, yyyy', { locale: es })}
                                                </span>
                                            </div>
                                            <Badge variant="outline" className="w-fit bg-slate-900 border-none text-[8px] font-black text-white px-2 py-0.5 tracking-widest rounded-md shadow-sm">
                                                {tx.reference_number || 'N/A'}
                                            </Badge>
                                        </div>
                                    </TableCell>

                                    {/* Third Party & Concept */}
                                    <TableCell>
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110",
                                                isIncome ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                            )}>
                                                {isIncome ? <ArrowUpCircle className="h-6 w-6" /> : <ArrowDownCircle className="h-6 w-6" />}
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-black text-slate-900 italic tracking-tighter uppercase leading-none mb-1 group-hover:text-indigo-600 transition-colors">
                                                    {tx.party?.legal_name || 'Transferencia Interna / Otros'}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest line-clamp-1 max-w-[200px]">
                                                        {tx.description || 'Sin descripción'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Source Account */}
                                    <TableCell className="hidden md:table-cell">
                                        <div className="flex items-center gap-3 bg-white border border-slate-100 px-4 py-2 rounded-2xl shadow-sm w-fit group-hover:border-indigo-100 transition-all">
                                            {tx.account?.type === 'BANK' ? <Landmark className="h-4 w-4 text-indigo-400" /> : <Wallet className="h-4 w-4 text-emerald-400" />}
                                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest italic">{tx.account?.name}</span>
                                        </div>
                                    </TableCell>

                                    {/* Withholdings Integration */}
                                    <TableCell className="hidden md:table-cell">
                                        {totalWithholding > 0 ? (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex flex-col items-start gap-1 cursor-help">
                                                            <div className="flex items-center gap-2 px-2 py-1 bg-amber-50 rounded-lg border border-amber-100">
                                                                <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest italic">
                                                                    -${totalWithholding.toLocaleString('es-CO')}
                                                                </span>
                                                                <Info className="h-3 w-3 text-amber-400" />
                                                            </div>
                                                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Retenciones aplicadas</span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="bg-slate-900 text-white border-none p-4 rounded-xl shadow-active">
                                                        <p className="text-[9px] font-black uppercase tracking-widest mb-2 border-b border-white/10 pb-2">Detalle de Retenciones</p>
                                                        <div className="space-y-1.5">
                                                            {tx.withholdings.map((w: any) => (
                                                                <div key={w.id} className="flex justify-between gap-4">
                                                                    <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">
                                                                        {w.tax_configuration?.tax_name || w.tax_withholding?.name || 'Retención'}
                                                                    </span>
                                                                    <span className="text-[9px] font-black text-white italic">
                                                                        ${Number(w.applied_amount).toLocaleString('es-CO')}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ) : (
                                            <span className="text-[9px] font-bold text-slate-200 uppercase tracking-widest italic">N/A</span>
                                        )}
                                    </TableCell>

                                    {/* Net Value */}
                                    <TableCell className="text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={cn(
                                                "text-2xl font-black font-mono tracking-tighter italic leading-none group-hover:scale-105 transition-transform origin-right",
                                                isIncome ? "text-emerald-600" : "text-rose-600"
                                            )}>
                                                {isIncome ? '+' : '-'} ${Math.abs(tx.amount).toLocaleString('es-CO')}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                <span className={cn(
                                                    "text-[9px] font-black uppercase tracking-widest",
                                                    tx.is_reconciled ? "text-indigo-500" : "text-slate-300"
                                                )}>
                                                    {tx.is_reconciled ? 'Conciliado' : 'Registrado'}
                                                </span>
                                                {tx.is_reconciled ? (
                                                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                                                ) : (
                                                    <Activity className="h-3.5 w-3.5 text-slate-300 animate-pulse" />
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell className="pr-8 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                                onClick={() => handlePrintVoucher(tx)}
                                            >
                                                <Printer className="h-5 w-5" />
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-sm text-slate-300 hover:text-slate-900 transition-all">
                                                        <MoreHorizontal className="h-5 w-5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-2xl border-slate-100 shadow-premium p-2 w-48">
                                                    <DropdownMenuItem
                                                        className="rounded-xl font-black text-[9px] uppercase tracking-widest text-slate-400 focus:text-indigo-600 focus:bg-indigo-50 cursor-pointer"
                                                        onClick={() => handlePrintVoucher(tx)}
                                                    >
                                                        <FileText className="mr-2 h-4 w-4" /> Comprobante PDF
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="rounded-xl font-black text-[9px] uppercase tracking-widest text-slate-400 focus:text-indigo-600 focus:bg-indigo-50 cursor-pointer">
                                                        <Info className="mr-2 h-4 w-4" /> Ver Trazabilidad
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-slate-50" />
                                                    <DropdownMenuItem
                                                        className="rounded-xl font-black text-[9px] uppercase tracking-widest text-rose-500 focus:text-white focus:bg-rose-500 cursor-pointer"
                                                        onClick={() => handleVoid(tx.id)}
                                                    >
                                                        <ArrowDownCircle className="mr-2 h-4 w-4" /> Anular Movimiento
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
