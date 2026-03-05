"use client";

import { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/shared/components/ui/table";
import {
    Search,
    ArrowDownLeft,
    ArrowUpRight,
    Warehouse as WarehouseIcon,
    Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";
import { inventoryService } from "../services/inventoryService";
import { createClient } from "@/lib/supabase/client";

interface Props {
    warehouses: Record<string, unknown>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function InventoryHistoryTable({ warehouses }: Props) {
    const [movements, setMovements] = useState<Record<string, unknown>[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [warehouseFilter, setWarehouseFilter] = useState("all");

    const supabase = createClient();

    useEffect(() => {
        fetchMovements();
    }, [search, typeFilter, warehouseFilter]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchMovements = async () => {
        setLoading(true);
        try {
            const data = await inventoryService.getAllMovements(supabase, {
                search,
                type: typeFilter,
                warehouse_id: warehouseFilter,
                limit: 100
            });
            setMovements(data);
        } catch (error) {
            console.error("Error fetching movements:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4 pb-16">
            {/* Filter bar */}
            <div className="bg-white rounded-xl p-3 border border-slate-100 flex flex-col xl:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por producto o SKU..."
                        className="w-full h-9 bg-slate-50 border-none rounded-lg pl-10 pr-4 text-sm placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-200 outline-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 w-full xl:w-auto">
                    <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
                        {['all', 'IN', 'OUT', 'TRANSFER'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setTypeFilter(t)}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap",
                                    typeFilter === t
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                {t === 'all' ? 'Todos' : t === 'IN' ? 'Entradas' : t === 'OUT' ? 'Salidas' : 'Transf.'}
                            </button>
                        ))}
                    </div>

                    <select
                        className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 focus:ring-0 cursor-pointer"
                        value={warehouseFilter}
                        onChange={(e) => setWarehouseFilter(e.target.value)}
                    >
                        <option value="all">Todas las Bodegas</option>
                        {warehouses.map(w => (
                            <option key={String(w.id)} value={String(w.id)}>{String(w.name)}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-100 hover:bg-transparent">
                                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 pl-5 py-3">Fecha</TableHead>
                                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3">Producto</TableHead>
                                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3 text-center">Bodega</TableHead>
                                    <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3 text-right">Cantidad</TableHead>
                                    <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-3 pr-5">Referencia</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-16 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="h-8 w-8 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                                                <p className="text-xs text-slate-400">Cargando movimientos...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : movements.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-16 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300">
                                                    <Sparkles className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">Sin movimientos</p>
                                                    <p className="text-xs text-slate-400 mt-1">No se encontraron registros con los filtros aplicados</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    movements.map((mov) => {
                                        const isIn = mov.type === 'IN';
                                        const Icon = isIn ? ArrowDownLeft : ArrowUpRight;
                                        const products = mov.products as Record<string, unknown> | null;
                                        const movWarehouses = mov.warehouses as Record<string, unknown> | null;

                                        return (
                                            <TableRow key={String(mov.id)} className="border-slate-50 hover:bg-slate-50/50">
                                                <TableCell className="py-3 pl-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "h-8 w-8 rounded-lg flex items-center justify-center",
                                                            isIn ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                                        )}>
                                                            <Icon className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold text-slate-900">
                                                                {mov.occurred_at ? format(new Date(String(mov.occurred_at)), "dd MMM yyyy", { locale: es }) : '-'}
                                                            </p>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <Badge className={cn(
                                                                    "border-none px-1.5 py-0 text-[9px] font-semibold rounded-full",
                                                                    isIn ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                                                )}>
                                                                    {isIn ? 'Entrada' : 'Salida'}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="py-3">
                                                    <p className="text-xs font-semibold text-slate-900 truncate max-w-[240px]">
                                                        {String(products?.name || '')}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                        {String(products?.sku || '')}
                                                    </p>
                                                </TableCell>

                                                <TableCell className="py-3 text-center">
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-100 text-slate-600">
                                                        <WarehouseIcon className="h-3 w-3" />
                                                        <span className="text-[10px] font-semibold">{String(movWarehouses?.name || '')}</span>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="py-3 text-right">
                                                    <span className={cn(
                                                        "text-sm font-bold tabular-nums",
                                                        isIn ? "text-emerald-600" : "text-rose-600"
                                                    )}>
                                                        {isIn ? '+' : '-'}{Number(mov.qty).toLocaleString('es-CO')}
                                                    </span>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                        ${Number(mov.cost).toLocaleString('es-CO')} c/u
                                                    </p>
                                                </TableCell>

                                                <TableCell className="py-3 pr-5 text-right">
                                                    <p className="text-xs font-semibold text-slate-900">
                                                        #{String(mov.ref_doc_id || '').substring(0, 8) || 'INTERNO'}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                        {String(mov.ref_doc_type || 'Manual')}
                                                    </p>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
