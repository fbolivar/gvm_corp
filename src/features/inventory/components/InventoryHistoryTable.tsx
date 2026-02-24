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
import { Input } from "@/shared/components/ui/input";
import {
    Search,
    Filter,
    ArrowDownLeft,
    ArrowUpRight,
    Warehouse as WarehouseIcon,
    History as HistoryIcon,
    Tag,
    Clock,
    FileText,
    ChevronRight,
    Sparkles,
    Cpu,
    Target,
    Zap,
    Download,
    ArrowRightLeft
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { inventoryService } from "../services/inventoryService";
import { createClient } from "@/lib/supabase/client";

interface Props {
    warehouses: any[];
}

export function InventoryHistoryTable({ warehouses }: Props) {
    const [movements, setMovements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [warehouseFilter, setWarehouseFilter] = useState("all");

    const supabase = createClient();

    useEffect(() => {
        fetchMovements();
    }, [search, typeFilter, warehouseFilter]);

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
        <div className="space-y-10 animate-in fade-in duration-1000 pb-20">
            {/* 🛠️ PREMIUM INDUSTRIAL FILTER BAR */}
            <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-white p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-premium border border-slate-50 relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-[0.02] pointer-events-none transition-transform group-hover:scale-110">
                    <HistoryIcon className="h-16 w-16" />
                </div>

                <div className="relative w-full md:w-[350px] lg:w-[500px] z-10">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por artículo o referencia SKU..."
                        className="w-full bg-slate-50 border-none rounded-2xl h-14 pl-14 pr-6 text-xs font-black uppercase tracking-widest text-slate-900 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-300 shadow-inner"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-4 z-10 w-full md:w-auto overflow-x-auto no-scrollbar snap-x">
                    <div className="flex bg-slate-50 p-1.5 rounded-2xl shadow-inner shrink-0">
                        {['all', 'IN', 'OUT', 'TRANSFER'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setTypeFilter(t)}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                    typeFilter === t
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                {t === 'all' ? 'Ver Todo' : t === 'IN' ? 'Entradas' : t === 'OUT' ? 'Salidas' : 'Transf.'}
                            </button>
                        ))}
                    </div>

                    <div className="h-8 w-[1px] bg-slate-200 shrink-0" />

                    <select
                        className="h-14 px-6 bg-slate-50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-0 cursor-pointer shadow-inner min-w-[200px]"
                        value={warehouseFilter}
                        onChange={(e) => setWarehouseFilter(e.target.value)}
                    >
                        <option value="all">Todas las Bodegas</option>
                        {warehouses.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>

                    <Button variant="outline" className="h-14 px-8 rounded-2xl border-slate-100 bg-white text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 hover:text-slate-900 transition-all shrink-0">
                        <Download className="h-4 w-4 mr-3" /> Reportar
                    </Button>
                </div>
            </div>

            {/* Main Table Card */}
            <Card className="border-none shadow-premium bg-white rounded-[2rem] md:rounded-[3.5rem] overflow-hidden p-2 relative border border-slate-100/50">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                    <Cpu className="h-48 w-48 text-slate-900" />
                </div>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/50 font-black">
                                <TableRow className="border-slate-50 hover:bg-transparent">
                                    <TableHead className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 pl-12 py-10 italic">Trazabilidad Temporal</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 py-10 italic">Componente Logístico</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 py-10 italic text-center">Protocolo Origen</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 py-10 italic text-right">Magnitud Flux</TableHead>
                                    <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 py-10 pr-12 italic">Ref. Protocolaria</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-60 text-center">
                                            <div className="flex flex-col items-center gap-8 group">
                                                <div className="relative">
                                                    <div className="h-24 w-24 border-[6px] border-slate-100 border-t-primary rounded-[2.5rem] animate-spin shadow-inner" />
                                                    <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-primary animate-pulse" />
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-slate-900 font-black text-2xl italic uppercase tracking-tighter">Sincronizando Ledger</p>
                                                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Compas de espera activo...</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : movements.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-60 text-center">
                                            <div className="flex flex-col items-center gap-8 group">
                                                <div className="h-24 w-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 border-4 border-white shadow-premium group-hover:rotate-12 transition-transform duration-700">
                                                    <HistoryIcon className="h-12 w-12" />
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="text-slate-900 font-black text-3xl tracking-tighter italic uppercase underline decoration-slate-500/10 underline-offset-8">Logs Inexistentes</h3>
                                                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mt-6">No se detectaron transacciones en el sector de memoria actual.</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    movements.map((mov) => {
                                        const isIn = mov.type === 'IN';
                                        const Icon = isIn ? ArrowDownLeft : ArrowUpRight;

                                        return (
                                            <TableRow key={mov.id} className="border-slate-50 hover:bg-slate-50/80 transition-all duration-500 group">
                                                <TableCell className="py-10 pl-12">
                                                    <div className="flex items-center gap-6">
                                                        <div className={cn(
                                                            "h-16 w-16 rounded-[1.5rem] flex items-center justify-center shadow-premium group-hover:rotate-6 group-hover:scale-110 transition-all duration-700 relative overflow-hidden",
                                                            isIn ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                                        )}>
                                                            <div className="absolute inset-0 opacity-20 bg-grid-slate-200" />
                                                            <Icon className="h-8 w-8 relative z-10" />
                                                        </div>
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <Clock className="h-3.5 w-3.5 text-slate-300" />
                                                                <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest font-mono">
                                                                    {mov.occurred_at ? format(new Date(mov.occurred_at), "dd MMM, yyyy • HH:mm", { locale: es }) : '-'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className={cn(
                                                                    "border-none px-3 py-1 font-black text-[8px] uppercase tracking-[0.2em] rounded-full shadow-sm italic",
                                                                    isIn ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                                                                )}>
                                                                    {isIn ? 'Activo Entrante' : 'Activo Saliente'}
                                                                </Badge>
                                                                <Sparkles className="h-3 w-3 text-slate-200 group-hover:text-amber-400 transition-colors" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="py-10">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-lg font-black text-slate-900 tracking-tighter italic uppercase group-hover:text-primary transition-colors duration-500 truncate max-w-[280px]">
                                                            {mov.products?.name}
                                                        </span>
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="bg-slate-900 px-2.5 py-0.5 rounded-md shadow-sm">
                                                                <span className="text-[9px] font-mono font-black text-white hover:text-primary hover:bg-slate-50 transition-colors">
                                                                    {mov.products?.sku}
                                                                </span>
                                                            </div>
                                                            <div className="h-1 w-1 rounded-full bg-slate-200" />
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Inventory Unit</span>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="py-10">
                                                    <div className="flex justify-center flex-col items-center gap-2">
                                                        <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-white border border-slate-100 shadow-sm text-slate-600 group-hover:border-primary group-hover:text-primary transition-all duration-500">
                                                            <WarehouseIcon className="h-4 w-4" />
                                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">{mov.warehouses?.name}</span>
                                                        </div>
                                                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest italic group-hover:text-slate-400 transition-colors">Centro logístico primario</span>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="py-10 text-right">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className={cn(
                                                            "text-3xl font-black tracking-tighter italic tabular-nums leading-none transition-transform group-hover:scale-110",
                                                            isIn ? "text-emerald-600" : "text-rose-600"
                                                        )}>
                                                            {isIn ? '+' : '-'}{Number(mov.qty).toLocaleString('es-CO')}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Costo Base: </span>
                                                            <span className="text-[10px] font-mono font-black text-slate-900">${Number(mov.cost).toLocaleString('es-CO')}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="py-10 pr-12 text-right">
                                                    <div className="flex items-center justify-end gap-4">
                                                        <div className="flex flex-col items-end gap-1.5">
                                                            <div className="flex items-center gap-2.5 group/ref">
                                                                <span className="text-xl font-black text-slate-900 tracking-tighter italic leading-none group-hover/ref:text-primary transition-colors">
                                                                    #{mov.ref_doc_id?.substring(0, 8) || 'INTERNO'}
                                                                </span>
                                                                <ArrowRightLeft className="h-4 w-4 text-slate-200 group-hover/ref:rotate-180 transition-transform duration-700" />
                                                            </div>
                                                            <Badge variant="outline" className="bg-slate-50 text-slate-400 border-none text-[8px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-[0.2em] shadow-inner italic">
                                                                {mov.ref_doc_type || 'Operación Manual'}
                                                            </Badge>
                                                        </div>
                                                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-none bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white shadow-sm transition-all duration-500 hover:scale-110 active:scale-90 opacity-0 group-hover:opacity-100">
                                                            <ChevronRight className="h-6 w-6" />
                                                        </Button>
                                                    </div>
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
