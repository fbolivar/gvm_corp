"use client";

import { InventoryMovement } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowDownLeft, ArrowUpRight, FileText, LayoutList, Clock, Warehouse, Box, ChevronRight, Zap, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

interface ProductKardexProps {
    movements: (InventoryMovement & { warehouses: { name: string } })[];
}

export function ProductKardex({ movements }: ProductKardexProps) {
    if (!movements || movements.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border border-slate-100 shadow-premium group">
                <div className="h-24 w-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 border-4 border-white shadow-premium group-hover:rotate-12 transition-transform duration-700">
                    <Box className="h-10 w-10" />
                </div>
                <div className="mt-8 space-y-2 text-center">
                    <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">Historial Vacío</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">No se detectaron transacciones para este SKU</p>
                </div>
            </div>
        );
    }

    // Sort movements by date to calculate running balance
    const getTime = (dateStr?: string | null) => dateStr ? new Date(dateStr).getTime() : 0;

    const sortedMovements = [...movements].sort((a, b) =>
        getTime(a.occurred_at || a.created_at) - getTime(b.occurred_at || b.created_at)
    );

    let runningQty = 0;
    let runningValue = 0;

    const kardexWithBalances = sortedMovements.map(mov => {
        const qty = Number(mov.qty);
        const cost = Number(mov.cost);
        const isIn = mov.type === 'IN';

        if (isIn) {
            runningQty += qty;
            runningValue += (qty * cost);
        } else if (mov.type === 'OUT') {
            // Weighted average for the exit
            const avgBefore = runningQty > 0 ? (runningValue / runningQty) : cost;
            runningQty -= qty;
            runningValue -= (qty * avgBefore);
        }

        return {
            ...mov,
            balanceQty: runningQty,
            balanceValue: runningValue,
            avgCost: runningQty > 0 ? (runningValue / runningQty) : 0
        };
    }).reverse(); // Display most recent first for the UI

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex items-center justify-between px-6">
                <div className="flex items-center gap-6">
                    <div className="h-14 w-14 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-white shadow-active transition-transform hover:rotate-12">
                        <LayoutList className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic leading-none">
                            Trazabilidad <span className="text-primary tracking-normal">Kardex</span>
                        </h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                            <Zap className="h-3 w-3 text-amber-400 animate-pulse" />
                            Algoritmo de Costo Promedio Ponderado
                        </p>
                    </div>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 px-6 py-2.5 font-black text-[10px] uppercase tracking-widest shadow-sm rounded-full">
                    Sincronización Total
                </Badge>
            </div>

            <div className="bg-white rounded-[4rem] p-3 border border-slate-100 shadow-premium overflow-hidden group">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50/50">
                            <tr className="border-b border-slate-50">
                                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-left italic">Temporalidad</th>
                                <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-left italic">Protocolo Doc</th>
                                <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-center italic">Centro Logístico</th>
                                <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-right italic">Flux Art.</th>
                                <th className="px-6 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-right italic font-mono">Saldo Unit.</th>
                                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-right italic bg-slate-50/30">Valorización Activo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {kardexWithBalances.map((mov) => {
                                const isIn = mov.type === 'IN';
                                const Icon = isIn ? ArrowDownLeft : ArrowUpRight;
                                const documentLink = mov.ref_doc_id ? `/documents/${mov.ref_doc_id}` : null;

                                return (
                                    <tr key={mov.id} className="hover:bg-slate-50/50 transition-all duration-300 group/row">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-5">
                                                <div className={cn(
                                                    "h-12 w-12 rounded-2xl flex items-center justify-center shadow-premium group-hover/row:scale-110 group-hover/row:rotate-6 transition-all duration-500",
                                                    isIn ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                                )}>
                                                    <Icon className="h-6 w-6" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-base font-black text-slate-900 group-hover/row:text-primary transition-colors tracking-tight uppercase italic">
                                                        {format(new Date(mov.occurred_at || mov.created_at || ''), 'dd MMM yyyy', { locale: es })}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Clock className="h-3 w-3 text-slate-300" />
                                                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none">
                                                            {format(new Date(mov.occurred_at || mov.created_at || ''), 'HH:mm', { locale: es })} • {mov.type}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-8">
                                            <div className="flex flex-col gap-1.5">
                                                <Badge variant="outline" className="bg-slate-50 text-slate-500 border-none text-[8px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-[0.2em] shadow-inner italic w-fit">
                                                    {mov.ref_doc_type || 'AJUSTE'}
                                                </Badge>
                                                {documentLink && (
                                                    <Link href={documentLink} className="text-[10px] font-black text-slate-900 hover:text-primary uppercase tracking-widest flex items-center gap-2 transition-all">
                                                        <FileText size={12} className="text-slate-300" />
                                                        Ver Protocolo
                                                    </Link>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-8 text-center">
                                            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-600 group-hover/row:border-primary/20 transition-all">
                                                <Warehouse className="h-3.5 w-3.5" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">{mov.warehouses?.name || '---'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-8 text-right">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={cn(
                                                    "text-2xl font-black tracking-tighter italic tabular-nums leading-none",
                                                    isIn ? "text-emerald-600" : "text-rose-600"
                                                )}>
                                                    {isIn ? '+' : '-'}{Number(mov.qty).toLocaleString()}
                                                </span>
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Flux Magnitude</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-8 text-right">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-lg font-black text-slate-900 font-mono tracking-tighter italic leading-none">
                                                    {Number(mov.balanceQty).toLocaleString()}
                                                </span>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inventory Stock</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 text-right bg-slate-50/30">
                                            <div className="flex flex-col items-end gap-1.5">
                                                <span className="text-xl font-black text-slate-900 font-mono tracking-tighter italic leading-none">
                                                    ${Number(mov.balanceValue).toLocaleString('es-CO')}
                                                </span>
                                                <div className="flex items-center gap-2.5">
                                                    <Sparkles className="h-3 w-3 text-emerald-400" />
                                                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] italic">
                                                        CPP: ${Number(mov.avgCost).toLocaleString('es-CO')}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
