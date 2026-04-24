"use client"

import { useState, useMemo } from 'react';
import {
    Plus,
    Search,
    TrendingUp,
    AlertCircle,
    ShoppingCart,
    ArrowRightLeft,
    History,
    Box,
    ArrowUpRight,
    FileSpreadsheet,
    Warehouse,
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
    initialMovements: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
    initialStock: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
    movementsCount: number;
    trends: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    warehouses: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
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

    const filteredStock = useMemo(() => {
        return initialStock.filter(s => {
            const products = s.products as Record<string, unknown> | null;
            const matchesSearch =
                String(products?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(products?.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesWarehouse =
                selectedWarehouse === "all" || s.warehouse_id === selectedWarehouse;
            return matchesSearch && matchesWarehouse;
        });
    }, [initialStock, searchTerm, selectedWarehouse]);

    const totalValue = filteredStock.reduce((acc, s) => acc + (Number(s.qty) * Number(s.avg_cost)), 0);
    const criticalItems = filteredStock.filter(s => Number(s.qty) <= 0).length;

    return (
        <div className="space-y-6">
            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
                <Button variant="outline" asChild className="h-9 rounded-xl border-slate-200 text-xs font-semibold">
                    <Link href="/accounting/reports/inventory-valuation" className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        Valorización
                    </Link>
                </Button>
                <Button asChild className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs">
                    <Link href="/inventory/new" className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Nuevo Movimiento
                    </Link>
                </Button>
            </div>

            {/* Filter bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                    <Input
                        placeholder="Buscar por SKU, referencia o descripción..."
                        className="h-9 pl-9 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-indigo-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative w-full sm:w-auto sm:min-w-[220px]">
                    <Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none" />
                    <select
                        value={selectedWarehouse}
                        onChange={(e) => setSelectedWarehouse(e.target.value)}
                        title="Filtrar por bodega"
                        aria-label="Filtrar por bodega"
                        className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-200 focus:border-indigo-300 appearance-none"
                    >
                        <option value="all">Todas las bodegas</option>
                        {warehouses.map(w => (
                            <option key={String(w.id)} value={String(w.id)}>
                                {String(w.name)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl">
                    <CardContent className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <Badge className="bg-slate-50 text-slate-400 border border-slate-100 text-[10px] font-semibold px-2 py-0.5 rounded-full">NIIF</Badge>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Valorización</p>
                            <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-none truncate">
                                ${totalValue.toLocaleString('es-CO')}
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl">
                    <CardContent className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <ArrowRightLeft className="h-5 w-5" />
                            </div>
                            <Badge className="bg-slate-50 text-slate-400 border border-slate-100 text-[10px] font-semibold px-2 py-0.5 rounded-full">Flujo</Badge>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Movimientos</p>
                            <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-none tabular-nums">
                                {movementsCount}
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Link href="/inventory?filter=low_stock" className="block">
                    <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl hover:shadow-md transition-shadow cursor-pointer h-full">
                        <CardContent className="p-5 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                                    <AlertCircle className="h-5 w-5" />
                                </div>
                                <Badge className="bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-semibold px-2 py-0.5 rounded-full">Alerta</Badge>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Stock Critico</p>
                                <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-none tabular-nums">
                                    {criticalItems} <span className="text-slate-400 text-xs font-medium">SKUs</span>
                                </h3>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl">
                    <CardContent className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <ShoppingCart className="h-5 w-5" />
                            </div>
                            <Badge className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-semibold px-2 py-0.5 rounded-full">Activo</Badge>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Catalogo</p>
                            <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-none tabular-nums">
                                {filteredStock.length} <span className="text-slate-400 text-xs font-medium">SKUs</span>
                            </h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts & Movements */}
            <div className="grid gap-6 lg:grid-cols-12">
                <div className="lg:col-span-8">
                    <InventoryCharts data={trends} />
                </div>

                <div className="lg:col-span-4">
                    <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl h-full">
                        <CardHeader className="p-5 pb-3 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <History className="h-4 w-4 text-indigo-600" />
                                    <CardTitle className="text-sm font-bold text-slate-900">
                                        Movimientos Recientes
                                    </CardTitle>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-slate-400 hover:text-indigo-600" asChild>
                                    <Link href="/inventory/history">
                                        <ArrowUpRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-3">
                            <InventoryList movements={initialMovements} />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Stock Table */}
            <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-5 pb-3 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Box className="h-4 w-4 text-slate-600" />
                            <CardTitle className="text-sm font-bold text-slate-900">Stock por Bodega</CardTitle>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                            {selectedWarehouse === 'all' ? 'Todas las bodegas' : String(warehouses.find(w => String(w.id) === selectedWarehouse)?.name || '')}
                        </span>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <StockOverview stock={filteredStock} />
                </CardContent>
            </Card>
        </div>
    );
}
