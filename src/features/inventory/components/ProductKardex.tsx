"use client";

import { InventoryMovement } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowDownLeft, ArrowUpRight, FileText, LayoutList, Warehouse, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/shared/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { cn } from '@/shared/lib/utils';

interface ProductKardexProps {
    movements: (InventoryMovement & { warehouses: { name: string } })[];
}

export function ProductKardex({ movements }: ProductKardexProps) {
    if (!movements || movements.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-slate-100 opacity-30">
                <Sparkles className="h-8 w-8 text-slate-300" />
                <p className="text-xs text-slate-400 mt-3">Sin movimientos registrados para este producto</p>
            </div>
        );
    }

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
    }).reverse();

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <LayoutList className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Trazabilidad Kardex</h3>
                <span className="text-[10px] text-slate-400 font-medium ml-auto">Costo Promedio Ponderado</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-slate-100">
                            <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Fecha</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Documento</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider text-center">Bodega</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider text-right">Cantidad</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider text-right">Saldo</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider text-right">Valor</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {kardexWithBalances.map((mov) => {
                            const isIn = mov.type === 'IN';
                            const Icon = isIn ? ArrowDownLeft : ArrowUpRight;
                            const documentLink = mov.ref_doc_id ? `/documents/${mov.ref_doc_id}` : null;

                            return (
                                <TableRow key={mov.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                                                isIn ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                            )}>
                                                <Icon className="h-3.5 w-3.5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-900">
                                                    {format(new Date(mov.occurred_at || mov.created_at || ''), 'dd MMM yyyy', { locale: es })}
                                                </p>
                                                <span className="text-[10px] text-slate-400">
                                                    {format(new Date(mov.occurred_at || mov.created_at || ''), 'HH:mm', { locale: es })}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="border-slate-200 text-[10px] font-semibold text-slate-500 rounded-full px-2 py-0.5">
                                            {mov.ref_doc_type || 'AJUSTE'}
                                        </Badge>
                                        {documentLink && (
                                            <Link href={documentLink} className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1 mt-1">
                                                <FileText className="h-3 w-3" /> Ver
                                            </Link>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1.5 text-slate-500">
                                            <Warehouse className="h-3 w-3" />
                                            <span className="text-xs">{mov.warehouses?.name || '---'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={cn(
                                            "text-sm font-bold tabular-nums",
                                            isIn ? "text-emerald-600" : "text-rose-600"
                                        )}>
                                            {isIn ? '+' : '-'}{Number(mov.qty).toLocaleString()}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className="text-sm font-bold text-slate-900 tabular-nums">
                                            {Number(mov.balanceQty).toLocaleString()}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm font-bold text-slate-900 tabular-nums">
                                                ${Number(mov.balanceValue).toLocaleString('es-CO')}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                CPP: ${Number(mov.avgCost).toLocaleString('es-CO')}
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
