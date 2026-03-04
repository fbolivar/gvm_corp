"use client"

import { useState, useMemo } from 'react';
import {
    Plus,
    Search,
    Warehouse as WarehouseIcon,
    ArrowRightLeft,
    History,
    ChevronRight,
    TrendingUp,
    AlertCircle,
    ShoppingCart,
    Box,
    Sparkles,
    ShieldCheck,
    ArrowDownRight,
    ArrowUpRight,
    Zap
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { StockOverview } from './StockOverview';
import { InventoryList } from './InventoryList';
import { InventoryCharts } from './InventoryCharts';
import { cn } from "@/shared/lib/utils";

interface Props {
    initialMovements: any[];
    initialStock: any[];
    movementsCount: number;
    trends: any;
    warehouses: any[];
}

export function InventoryDashboard({
    initialMovements,
    initialStock,
    movementsCount,
    trends,
    warehouses
}: Props) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedWarehouse, setSelectedWarehouse] = useState<string | "all">("all");

    // Filter stock based on search and warehouse
    const filteredStock = useMemo(() => {
        return initialStock.filter(s => {
            const matchesSearch =
                s.products?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.products?.sku.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesWarehouse =
                selectedWarehouse === "all" || s.warehouse_id === selectedWarehouse;

            return matchesSearch && matchesWarehouse;
        });
    }, [initialStock, searchTerm, selectedWarehouse]);

    const totalValue = filteredStock.reduce((acc, s) => acc + (Number(s.qty) * Number(s.avg_cost)), 0);
    const criticalItems = filteredStock.filter(s => Number(s.qty) <= 0).length;

    return (
        <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* 💎 PREMIUM HEADER SECTION */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 px-1">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="px-2.5 py-1 bg-slate-900 rounded-full flex items-center gap-2 shadow-active">
                            <Zap className="h-2 w-2 text-amber-400 fill-amber-400" />
                            <span className="text-[8px] font-bold text-white uppercase tracking-widest">Gestión de Activos</span>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight italic uppercase leading-none">
                            Kardex <span className="text-primary">Lógico</span>
                        </h1>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                            <p className="text-slate-400 font-bold text-[8px] uppercase tracking-widest">Centro de Operaciones Logísticas</p>
                            <div className="hidden sm:block h-2.5 w-[1px] bg-slate-200" />
                            <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 shadow-sm w-fit">
                                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">{warehouses.length} Centros Distribución</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 self-start xl:self-end">
                    <Button variant="outline" asChild className="h-10 px-6 rounded-lg border border-slate-100 bg-white shadow-sm text-slate-500 font-bold hover:bg-slate-50 transition-all active:scale-95 group">
                        <Link href="/accounting/reports/inventory-valuation" className="flex items-center gap-2">
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-500 group-hover:rotate-12 transition-transform" />
                            <span className="text-[9px] uppercase tracking-widest">Valorización</span>
                        </Link>
                    </Button>
                    <Button asChild className="h-10 px-6 rounded-lg bg-slate-900 hover:bg-primary text-white font-bold shadow-active transition-all active:scale-95 border-none group">
                        <Link href="/inventory/new" className="flex items-center gap-2.5">
                            <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-500" />
                            <span className="text-[9px] uppercase tracking-widest">Nuevo Movimiento</span>
                        </Link>
                    </Button>
                </div>
            </div>

            {/* 🔍 PREMIUM INDUSTRIAL FILTER BAR */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100/50 flex flex-col xl:flex-row items-center gap-3 relative overflow-hidden group">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Buscar por SKU, Referencia o Descripción..."
                        className="h-10 pl-12 bg-slate-50/50 border-none rounded-lg font-bold text-slate-900 placeholder:text-slate-300 focus-visible:ring-0 shadow-inner group-focus-within:bg-white transition-all text-sm tracking-tight"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50/80 p-1.5 rounded-xl w-full xl:w-auto overflow-x-auto no-scrollbar border border-slate-100 snap-x">
                    <button
                        onClick={() => setSelectedWarehouse("all")}
                        className={cn(
                            "px-5 py-2.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap snap-start",
                            selectedWarehouse === "all"
                                ? "bg-slate-900 text-white shadow-sm"
                                : "text-slate-400 hover:text-slate-900 hover:bg-white"
                        )}
                    >
                        Total Corporativo
                    </button>
                    {warehouses.map(w => (
                        <button
                            key={w.id}
                            onClick={() => setSelectedWarehouse(w.id)}
                            className={cn(
                                "px-5 py-2.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap snap-start",
                                selectedWarehouse === w.id
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "text-slate-400 hover:text-slate-900 hover:bg-white"
                            )}
                        >
                            {w.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4 px-1">
                <Card className="rounded-xl border-none bg-white shadow-sm relative overflow-hidden group hover:translate-y-[-2px] transition-all duration-300">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm transition-all">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                            <Badge className="bg-slate-50 text-slate-400 border border-slate-100 text-[7px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-widest">NIIF</Badge>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 opacity-80 italic">Valorización</p>
                            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight leading-none truncate italic">
                                ${totalValue.toLocaleString('es-CO')}
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-xl border-none bg-white shadow-sm relative overflow-hidden group hover:translate-y-[-2px] transition-all duration-300">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm transition-all">
                                <ArrowRightLeft className="h-4 w-4" />
                            </div>
                            <Badge className="bg-slate-50 text-slate-400 border border-slate-100 text-[7px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-widest">Flujo</Badge>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 opacity-80 italic">Movimientos</p>
                            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-none italic tabular-nums">
                                {movementsCount}
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Link href="/inventory?filter=low_stock" className="block">
                    <Card className="rounded-xl border-none bg-white shadow-sm relative overflow-hidden group hover:translate-y-[-2px] transition-all duration-300 cursor-pointer">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-3">
                                <div className="h-9 w-9 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shadow-sm transition-all group-hover:bg-rose-600 group-hover:text-white">
                                    <AlertCircle className="h-4 w-4" />
                                </div>
                                <Badge className="bg-rose-50 text-rose-600 border-none text-[7px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-widest">Alerta</Badge>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 opacity-80 italic">Stock Crítico</p>
                                <div className="flex items-end justify-between">
                                    <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none italic tabular-nums">
                                        {criticalItems} <span className="text-slate-300 text-xs tracking-normal">SKUs</span>
                                    </h3>
                                    <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-rose-600 transition-colors" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Card className="rounded-xl border-none bg-slate-900 shadow-active relative overflow-hidden group hover:translate-y-[-2px] transition-all duration-300">
                    <Box className="absolute -bottom-4 -right-4 h-24 w-24 text-white/5 rotate-12 transition-transform group-hover:rotate-45 duration-700" />
                    <CardContent className="p-6 relative z-10 text-white">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center text-white border border-white/10 shadow-inner group-hover:bg-primary transition-colors">
                                <ShoppingCart className="h-4 w-4" />
                            </div>
                            <div className="flex items-center gap-1.5 bg-emerald-500/20 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                                <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[7px] font-bold text-emerald-400 uppercase tracking-widest">Activo</span>
                            </div>
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[8px] font-bold text-white/50 uppercase tracking-widest mb-1 italic">Catálogo</p>
                            <h3 className="text-2xl font-extrabold tracking-tight leading-none italic tabular-nums">
                                {filteredStock.length} <span className="text-white/30 text-xs tracking-normal">SKUs</span>
                            </h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 📈 CHARTS & MOVEMENTS SECTION */}
            <div className="grid gap-6 lg:grid-cols-12 px-1">
                <div className="lg:col-span-8 rounded-2xl bg-slate-50/50 border border-slate-100 p-1.5 shadow-inner overflow-hidden">
                    <InventoryCharts data={trends as any} />
                </div>

                <div className="lg:col-span-4 flex flex-col gap-6">
                    <Card className="border-none bg-white shadow-premium rounded-2xl flex-1 overflow-hidden group/list">
                        <CardHeader className="p-6 pb-3 bg-slate-50/30 border-b border-slate-100 relative overflow-hidden">
                            <History className="absolute -right-3 -top-3 h-12 w-12 text-slate-100 opacity-20 rotate-12" />
                            <div className="flex items-center justify-between relative z-10">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <History className="h-3.5 w-3.5 text-primary" />
                                        <CardTitle className="text-base font-extrabold text-slate-900 tracking-tight italic">
                                            Logs Logísticos
                                        </CardTitle>
                                    </div>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Actividad Reciente</p>
                                </div>
                                <Button variant="ghost" className="h-7 w-7 rounded-lg text-slate-300 hover:text-primary hover:bg-white transition-all p-0" asChild>
                                    <Link href="/inventory/history" title="Ver todo">
                                        <ArrowUpRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-3">
                            <InventoryList movements={initialMovements as any || []} />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* 📦 GLOBAL STOCK TABLE SECTION */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1 lg:px-2">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-active">
                            <Box className="h-4 w-4" />
                        </div>
                        <div className="space-y-0.5">
                            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight italic leading-none">Disponibilidad Logística</h2>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <ShieldCheck className="h-2.5 w-2.5 text-emerald-500" />
                                Sincronizado
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Vista:</span>
                        <span className="text-[9px] font-bold text-slate-900 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md italic">
                            {selectedWarehouse === 'all' ? 'Total' : warehouses.find(w => w.id === selectedWarehouse)?.name}
                        </span>
                    </div>
                </div>
                <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-1.5 border border-white/50 shadow-inner">
                    <StockOverview stock={filteredStock as any} />
                </div>
            </div>
        </div>
    );
}
