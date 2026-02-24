"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { dashboardService } from "../services/dashboardService"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/shared/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/components/ui/table"
import { Badge } from "@/shared/components/ui/badge"
import { Loader2, Calendar, User, FileText, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Props {
    isOpen: boolean;
    onClose: () => void;
    bucket: {
        label: string;
        min: number;
        max: number | null;
        color: string;
    } | null;
}

export function ARDetailDialog({ isOpen, onClose, bucket }: Props) {
    const [invoices, setInvoices] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        if (isOpen && bucket) {
            loadDetails()
        }
    }, [isOpen, bucket])

    async function loadDetails() {
        if (!bucket) return
        setLoading(true)
        try {
            console.log("Loading details for bucket:", bucket);
            const data = await dashboardService.getARAgingInvoices(supabase, bucket.min, bucket.max)
            console.log("Details loaded:", data);
            setInvoices(data)
        } catch (error: any) {
            console.error("Error loading AR details:", {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            })
        } finally {
            setLoading(false)
        }
    }

    if (!bucket) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl bg-white border-none rounded-[2.5rem] p-0 overflow-hidden shadow-active">
                <div className={cn("p-8 text-white relative overflow-hidden", bucket.color)}>
                    <div className="absolute top-0 right-0 p-8 opacity-[0.1] pointer-events-none">
                        <FileText className="h-32 w-32" />
                    </div>
                    <DialogHeader className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-white/20 text-white border-none font-bold text-[8px] uppercase tracking-widest px-2">
                                Detalle de Cartera
                            </Badge>
                        </div>
                        <DialogTitle className="text-3xl font-black italic tracking-tighter uppercase">
                            Facturas: {bucket.label}
                        </DialogTitle>
                        <DialogDescription className="text-white/60 font-medium text-xs">
                            Listado detallado de cuentas por cobrar en este tramo de mora.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-8">
                    {loading ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="h-8 w-8 text-slate-200 animate-spin" />
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Sincronizando Detalles...</p>
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4 text-center">
                            <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200">
                                <FileText className="h-8 w-8" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-black text-slate-900 uppercase italic tracking-tight">Sin Facturas</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">No hay deuda reportada en este periodo.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar border rounded-2xl">
                            <Table>
                                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                    <TableRow className="border-none">
                                        <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-6 py-4">Factura</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 py-4">Cliente</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 py-4">Vencimiento</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 py-4 text-right pr-6">Monto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.map((inv) => (
                                        <TableRow key={inv.id} className="border-slate-50 group hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="pl-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-sm font-black italic tracking-tighter text-slate-900">{inv.number}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                        <User className="h-3 w-3" />
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight truncate max-w-[150px]">
                                                        {inv.party?.legal_name || 'Desconocido'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-900 transition-colors">
                                                    <Calendar className="h-3 w-3" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">
                                                        {format(new Date(inv.due_date), 'dd MMM yyyy', { locale: es })}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <span className="text-sm font-black italic tracking-tighter text-slate-900 tabular-nums">
                                                    ${inv.total.toLocaleString('es-CO')}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ");
}
