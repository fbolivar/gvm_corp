"use client"

import { useState } from "react"
import { Document } from "@/features/documents/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { format } from "date-fns"
import { Button } from "@/shared/components/ui/button"
import {
    Truck,
    Eye,
    Receipt,
    Calendar,
    ArrowUpRight,
    Search,
    Box,
    Clock,
    PackageCheck,
    AlertCircle,
    ChevronRight,
    Filter,
    Download,
    Loader2
} from "lucide-react"
import Link from "next/link"
import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent } from "@/shared/components/ui/card"
import { cn } from "@/shared/lib/utils"
import { useToast } from "@/shared/hooks/use-toast"
import { markAsReceivedAction } from "@/features/purchasing/actions"
import { IndustrialApprovalFlow } from "./IndustrialApprovalFlow"
import { useRouter } from "next/navigation"

interface PurchaseOrderListProps {
    orders: Document[]
}

export function PurchaseOrderList({ orders }: PurchaseOrderListProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();
    const router = useRouter();
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const handleMarkAsReceived = async (docId: string) => {
        setActionLoading(docId);
        try {
            const result = await markAsReceivedAction(docId);
            if (result.success) {
                toast({
                    title: "RECEPCIÓN EXITOSA",
                    description: "La mercancía ha sido ingresada al inventario del sistema.",
                    variant: "default",
                });
                router.refresh();
            } else {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive",
                });
            }
        } catch (error: any) {
            toast({
                title: "Error Fatal",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setActionLoading(null);
        }
    };

    const filteredOrders = orders.filter(order =>
        order.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.party?.legal_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'DRAFT': 'bg-slate-100 text-slate-500',
            'SENT': 'bg-blue-100 text-blue-700',
            'ACCEPTED': 'bg-emerald-100 text-emerald-700',
            'CANCELLED': 'bg-rose-100 text-rose-700',
        };
        const labels: Record<string, string> = {
            'DRAFT': 'En Tránsito / Draft',
            'SENT': 'Enviada a Proveedor',
            'ACCEPTED': 'Mercancía Recibida',
            'CANCELLED': 'Orden Anulada',
        };

        const Icon = status === 'ACCEPTED' ? PackageCheck : status === 'DRAFT' ? Clock : status === 'SENT' ? Truck : AlertCircle;

        return (
            <Badge variant="outline" className={cn("border-none px-4 py-1.5 font-black text-[9px] uppercase tracking-widest flex items-center gap-2 rounded-full shadow-sm", styles[status] || '')}>
                <Icon className="h-3.5 w-3.5" />
                {labels[status] || status}
            </Badge>
        )
    };

    return (
        <div className="space-y-8">
            {/* 🛠️ ENHANCED SEARCH TOOLBAR */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-premium border border-slate-50 relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-[0.02] pointer-events-none transition-transform group-hover:scale-110">
                    <Search className="h-16 w-16" />
                </div>

                <div className="relative w-full md:w-[500px] z-10">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-amber-600 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por folio de orden o proveedor..."
                        className="w-full bg-slate-50 border-none rounded-2xl h-14 pl-14 pr-6 text-xs font-black uppercase tracking-widest text-slate-900 focus:ring-2 focus:ring-amber-600/10 transition-all placeholder:text-slate-300 shadow-inner"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-4 z-10 w-full md:w-auto">
                    <Button variant="outline" className="h-14 flex-1 md:flex-none px-6 rounded-2xl border-slate-100 bg-white text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:text-slate-900 transition-all">
                        <Filter className="h-4 w-4 mr-3" /> Logística
                    </Button>
                    <Button variant="outline" className="h-14 flex-1 md:flex-none px-6 rounded-2xl border-slate-100 bg-white text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:text-slate-900 transition-all">
                        <Download className="h-4 w-4 mr-3" /> Exportar
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-premium bg-white rounded-[3.5rem] overflow-hidden p-2">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-50 hover:bg-transparent">
                                <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] pl-14 py-12 italic">
                                    <div className="flex items-center gap-4">
                                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_theme(colors.amber.500)]" />
                                        PROVEEDOR / ORIGEN
                                    </div>
                                </TableHead>
                                <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] py-12 italic text-center">FLUJO OPERATIVO</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] py-12 text-right italic">MONTO TOTAL</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] py-12 text-right pr-14 italic">ACCIONES</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrders.length === 0 ? (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={5} className="py-32 text-center">
                                        <div className="flex flex-col items-center gap-6">
                                            <div className="h-24 w-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center shadow-inner text-slate-200 group-hover:rotate-12 transition-transform">
                                                <Box className="h-12 w-12" />
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-slate-900 font-black text-2xl tracking-tighter italic uppercase underline decoration-amber-500/30">Sin Órdenes</p>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">No se encontraron pedidos de compra con esos criterios.</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredOrders.map((order) => (
                                    <TableRow key={order.id} className="border-slate-50 hover:bg-slate-50/50 transition-all group">
                                        <TableCell className="py-10 pl-14">
                                            <div className="flex items-center gap-8">
                                                <div className="h-16 w-16 rounded-[1.5rem] bg-slate-950 flex items-center justify-center text-white group-hover:rotate-12 transition-all shadow-premium group-hover:scale-110 shadow-slate-900/10">
                                                    <Truck className="h-8 w-8 text-amber-500" />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-xl font-black text-slate-950 tracking-tighter uppercase italic leading-none group-hover:text-amber-600 transition-colors truncate w-72">{order.party?.legal_name || 'ORIGEN DESCONOCIDO'}</span>
                                                    <div className="flex items-center gap-4 mt-1">
                                                        <Badge variant="outline" className="bg-slate-50 border-none text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full group-hover:bg-white transition-all italic text-slate-400">FOLIO: {order.number}</Badge>
                                                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">REG. LOGÍSTICO V3.2</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-10">
                                            <div className="flex flex-col items-center gap-6">
                                                <IndustrialApprovalFlow currentStatus={order.status} className="scale-75 origin-top" />
                                                <div className="flex items-center gap-2 mt-[-1rem]">
                                                    <Calendar className="h-3 w-3 text-slate-300" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Emisión: {order.issue_date}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-10 text-right">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-4xl font-black text-slate-950 font-mono tracking-tighter italic leading-none group-hover:scale-110 origin-right transition-transform duration-500">
                                                    ${order.total.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                                                </span>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_theme(colors.amber.500)]" />
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] italic leading-none">VALOR / OC EXTERNA</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-10 text-right pr-14">
                                            <div className="flex items-center justify-end gap-5">
                                                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl bg-slate-50 text-slate-300 hover:text-amber-600 hover:bg-white hover:shadow-premium transition-all active:scale-90 border border-transparent hover:border-slate-100" asChild title="Ver Detalle">
                                                    <Link href={`/documents/${order.id}`}>
                                                        <Search className="h-7 w-7" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    className="h-14 px-8 rounded-[1.2rem] bg-indigo-50/50 text-indigo-400 hover:text-indigo-600 hover:bg-white hover:shadow-premium transition-all active:scale-95 border border-transparent hover:border-indigo-100 font-black text-[9px] uppercase tracking-widest group/rec"
                                                    disabled={order.status === 'ACCEPTED' || actionLoading === order.id}
                                                    onClick={() => order.id && handleMarkAsReceived(order.id)}
                                                >
                                                    {actionLoading === order.id ? (
                                                        <Loader2 className="h-5 w-5 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <PackageCheck className="h-6 w-6 mr-3 group-hover/rec:scale-110 transition-transform" />
                                                            RECIBIR CARGA
                                                        </>
                                                    )}
                                                </Button>

                                                <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl bg-slate-50 text-slate-300 hover:text-emerald-600 hover:bg-white hover:shadow-premium transition-all active:scale-90 border border-transparent hover:border-slate-100" asChild title="Convertir a Factura" disabled={order.status !== 'ACCEPTED'}>
                                                    <Link href={`/purchasing/bills/new?orderId=${order.id}`}>
                                                        <ArrowUpRight className="h-7 w-7" />
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
        </div>
    )
}
