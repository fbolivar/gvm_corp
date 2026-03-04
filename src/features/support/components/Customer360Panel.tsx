"use client"

import { useEffect, useState } from "react";
import { getCustomer360Action, generateRMAAction, generateCreditNoteAction } from "../actions";
import {
    Zap,
    AlertCircle,
    ChevronRight,
    ShoppingBag,
    ShieldCheck,
    Loader2
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { toast } from "sonner";

export function Customer360Panel({ partyId, ticketId }: { partyId: string, ticketId?: string }) {
    const [data, setData] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

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
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm animate-pulse">
            <div className="h-48" />
        </div>
    );

    const priceFormatter = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    });

    const ltv = Number(data?.ltv || 0);
    const pendingValue = Number(data?.pendingValue || 0);
    const invoiceCount = data?.invoiceCount ?? 0;
    const isVIP = Boolean(data?.isVIP);

    return (
        <div className="space-y-4">
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="p-5 pb-3">
                    <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="h-3 w-3 text-amber-500" />
                        Perfil Cliente 360
                    </h3>
                </div>
                <div className="px-5 pb-5 space-y-5">
                    {/* VIP Status */}
                    {isVIP && (
                        <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-amber-600" />
                                <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Cliente VIP</span>
                            </div>
                            <span className="text-[10px] font-medium text-amber-500 uppercase">Atencion Prioritaria</span>
                        </div>
                    )}

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Valor de Vida (LTV)</p>
                            <p className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                                {priceFormatter.format(ltv)}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Saldo Pendiente</p>
                            <p className={cn(
                                "text-sm font-bold font-mono tabular-nums",
                                pendingValue > 0 ? "text-rose-600" : "text-emerald-600"
                            )}>
                                {priceFormatter.format(pendingValue)}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-50">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Facturas Totales</p>
                            <span className="text-xs font-bold text-slate-900">{String(invoiceCount)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Promedio de Pago</p>
                            <span className="text-xs font-bold text-slate-900">12 Dias</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-slate-900 rounded-2xl overflow-hidden">
                <div className="p-5 space-y-3">
                    <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Acciones de Valor</p>

                    <button
                        disabled={!ticketId || isProcessing !== null}
                        onClick={async () => {
                            if (!ticketId) return;
                            setIsProcessing('rma');
                            const res = await generateRMAAction(ticketId);
                            setIsProcessing(null);
                            if (res.error) toast.error(res.error);
                            else toast.success("RMA Generado: Entrada de almacen creada");
                        }}
                        className="w-full p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left flex items-center gap-3 disabled:opacity-50"
                    >
                        <div className="h-8 w-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                            {isProcessing === 'rma' ? <Loader2 className="h-4 w-4 text-indigo-300 animate-spin" /> : <AlertCircle className="h-4 w-4 text-indigo-300" />}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-white">Gestionar RMA</p>
                            <p className="text-[10px] text-white/40 font-medium">Generar orden de devolucion</p>
                        </div>
                        <ChevronRight className="ml-auto h-3.5 w-3.5 text-white/20 shrink-0" />
                    </button>

                    <button
                        disabled={!ticketId || isProcessing !== null}
                        onClick={async () => {
                            if (!ticketId) return;
                            setIsProcessing('cn');
                            const res = await generateCreditNoteAction(ticketId);
                            setIsProcessing(null);
                            if (res.error) toast.error(res.error);
                            else toast.success("Nota de Credito Creada en Borrador");
                        }}
                        className="w-full p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left flex items-center gap-3 disabled:opacity-50"
                    >
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                            {isProcessing === 'cn' ? <Loader2 className="h-4 w-4 text-emerald-300 animate-spin" /> : <ShoppingBag className="h-4 w-4 text-emerald-300" />}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-white">Nota de Credito</p>
                            <p className="text-[10px] text-white/40 font-medium">Reembolsar saldo a favor</p>
                        </div>
                        <ChevronRight className="ml-auto h-3.5 w-3.5 text-white/20 shrink-0" />
                    </button>
                </div>
            </div>
        </div>
    );
}
