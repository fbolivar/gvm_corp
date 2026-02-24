"use client"

import { useEffect, useState } from "react";
import { getCustomer360Action, generateRMAAction, generateCreditNoteAction } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
    Zap,
    TrendingUp,
    AlertCircle,
    ChevronRight,
    ShoppingBag,
    ShieldCheck,
    Loader2
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
    partyId: string;
}

export function Customer360Panel({ partyId, ticketId }: { partyId: string, ticketId?: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        async function load() {
            setLoading(true);
            const res = await getCustomer360Action(partyId);
            setData(res);
            setLoading(false);
        }
        load();
    }, [partyId]);

    if (loading) return (
        <Card className="border-none bg-white shadow-premium rounded-[2.5rem] animate-pulse">
            <div className="h-64" />
        </Card>
    );

    const priceFormatter = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    });

    return (
        <div className="space-y-6">
            <Card className="border-none bg-white shadow-premium rounded-[2.5rem]">
                <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        Perfil Cliente 360
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-8">
                    {/* VIP Status */}
                    {data?.isVIP && (
                        <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 p-4 rounded-2xl border border-amber-200/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="h-5 w-5 text-amber-600" />
                                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Cliente VIP</span>
                            </div>
                            <span className="text-[8px] font-bold text-amber-500 uppercase tracking-tight">Atención Prioritaria</span>
                        </div>
                    )}

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor de Vida (LTV)</p>
                            <p className="text-xl font-black text-slate-900 tracking-tighter italic">
                                {priceFormatter.format(data?.ltv || 0)}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Pendiente</p>
                            <p className={cn(
                                "text-xl font-black tracking-tighter italic",
                                data?.pendingValue > 0 ? "text-rose-600" : "text-emerald-600"
                            )}>
                                {priceFormatter.format(data?.pendingValue || 0)}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-50">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Facturas Totales</p>
                            <span className="text-xs font-black text-slate-900">{data?.invoiceCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Promedio de Pago</p>
                            <span className="text-xs font-black text-slate-900">12 Días</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Quick Actions Panel */}
            <Card className="border-none bg-slate-900 shadow-premium rounded-[2.5rem] overflow-hidden group">
                <CardContent className="p-8 space-y-6">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Acciones de Valor</p>

                    <button
                        disabled={!ticketId || isProcessing !== null}
                        onClick={async () => {
                            if (!ticketId) return;
                            setIsProcessing('rma');
                            const res = await generateRMAAction(ticketId);
                            setIsProcessing(null);
                            if (res.error) toast.error(res.error);
                            else toast.success("RMA Generado: Entrada de almacén creada");
                        }}
                        className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left flex items-center gap-4 disabled:opacity-50"
                    >
                        <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                            {isProcessing === 'rma' ? <Loader2 className="h-5 w-5 text-indigo-300 animate-spin" /> : <AlertCircle className="h-5 w-5 text-indigo-300" />}
                        </div>
                        <div>
                            <p className="text-xs font-black text-white italic">Gestionar RMA</p>
                            <p className="text-[9px] text-white/40 font-medium">Generar orden de devolución</p>
                        </div>
                        <ChevronRight className="ml-auto h-4 w-4 text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </button>

                    <button
                        disabled={!ticketId || isProcessing !== null}
                        onClick={async () => {
                            if (!ticketId) return;
                            setIsProcessing('cn');
                            const res = await generateCreditNoteAction(ticketId);
                            setIsProcessing(null);
                            if (res.error) toast.error(res.error);
                            else toast.success("Nota de Crédito Creada en Borrador");
                        }}
                        className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left flex items-center gap-4 disabled:opacity-50"
                    >
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            {isProcessing === 'cn' ? <Loader2 className="h-5 w-5 text-emerald-300 animate-spin" /> : <ShoppingBag className="h-5 w-5 text-emerald-300" />}
                        </div>
                        <div>
                            <p className="text-xs font-black text-white italic">Nota de Crédito</p>
                            <p className="text-[9px] text-white/40 font-medium">Reembolsar saldo a favor</p>
                        </div>
                        <ChevronRight className="ml-auto h-4 w-4 text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </button>
                </CardContent>
            </Card>
        </div>
    );
}
