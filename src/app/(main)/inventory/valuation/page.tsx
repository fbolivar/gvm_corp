"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { inventoryService } from "@/features/inventory/services/inventoryService";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Input } from "@/shared/components/ui/input";
import {
    Search,
    DollarSign,
    Package,
    TrendingUp,
    PieChart as PieChartIcon,
    BarChart3,
    ArrowLeft,
    Tag,
    ChevronRight,
    ArrowUpRight,
    Download,
    FileText
} from "lucide-react";
import { pdfReportService } from "@/features/accounting/services/pdfReportService";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Legend
} from 'recharts';
import { VisualReportHeader } from "@/features/accounting/components/VisualReportHeader";

const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ValuationPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [tenant, setTenant] = useState<any>(null);
    const [isMounted, setIsMounted] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        setIsMounted(true);
        fetchValuation();
        fetchTenant();
    }, [search]);

    const fetchTenant = async () => {
        const { data } = await supabase.from('tenants').select('*').limit(1).single();
        setTenant(data);
    };

    const fetchValuation = async () => {
        setLoading(true);
        try {
            const result = await inventoryService.getValuation(supabase, search);
            setData(result);
        } catch (error) {
            console.error("Error fetching valuation:", error);
        } finally {
            setLoading(false);
        }
    };

    const totalInventoryValue = useMemo(() => data.reduce((acc, curr) => acc + Number(curr.total_value), 0), [data]);
    const totalItems = useMemo(() => data.reduce((acc, curr) => acc + Number(curr.total_qty), 0), [data]);

    // Data for charts
    const categoryData = useMemo(() => {
        const categories: Record<string, number> = {};
        data.forEach(item => {
            const cat = item.category || 'Sin Categoría';
            categories[cat] = (categories[cat] || 0) + Number(item.total_value);
        });
        return Object.entries(categories)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [data]);

    const topProductsData = useMemo(() => {
        return [...data]
            .sort((a, b) => b.total_value - a.total_value)
            .slice(0, 5)
            .map(item => ({
                name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
                value: Number(item.total_value)
            }));
    }, [data]);

    return (
        <div className="page-container space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <VisualReportHeader
                title="Valoración Maestría"
                subtitle="Consolidado de Activos en Stock"
                tenant={tenant}
            />

            {/* 📊 INDUSTRIAL STRIP (Global Metrics) */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-10 px-1">
                <div className="flex flex-wrap items-center gap-16">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">Capital Mobiliario</span>
                        <div className="flex items-center gap-6">
                            <h2 className="text-7xl font-black text-slate-900 tracking-tighter italic tabular-nums leading-none">
                                ${totalInventoryValue.toLocaleString('es-CO')}
                            </h2>
                            <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm group hover:scale-110 transition-transform">
                                <TrendingUp className="h-7 w-7" />
                            </div>
                        </div>
                    </div>
                    <div className="h-24 w-[1px] bg-slate-100 hidden lg:block" />
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">Items Activos</span>
                        <div className="flex items-baseline gap-4">
                            <span className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">{data.length}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg ml-2">SKUs Únicos</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative w-72">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                        <Input
                            placeholder="Buscar SKU..."
                            className="h-14 pl-12 bg-white border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-200 focus-visible:ring-4 focus-visible:ring-primary/5 shadow-premium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="outline"
                        className="h-14 px-8 rounded-2xl border-none bg-slate-900 text-white font-black hover:bg-slate-800 transition-all shadow-active gap-3"
                        onClick={async () => await pdfReportService.generateInventoryValuation(
                            data.map(r => ({
                                sku: r.sku,
                                name: r.name,
                                category: r.category,
                                stock: r.stock,
                                cost: r.avg_cost,
                                total_value: r.total_value
                            })),
                            {
                                title: 'Valoración de Inventarios',
                                companyName: tenant?.name || 'EMPRESA S.A.S',
                                companyNit: tenant?.nit,
                                companyAddress: tenant?.address,
                                companyPhone: tenant?.phone,
                                logoUrl: tenant?.logo_url || undefined,
                                period: new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).toUpperCase()
                            }
                        )}
                    >
                        <Download className="h-4 w-4 text-indigo-400" />
                        PDF PREMIUM
                    </Button>
                    <div className="h-14 border-l border-slate-100 mx-1 hidden md:block" />
                    <Button variant="outline" asChild className="h-14 px-8 rounded-2xl border-none bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-all shadow-active">
                        <Link href="/inventory" className="flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            DASHBOARD
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Graphics Row */}
            <div className="grid gap-8 lg:grid-cols-2">
                <Card className="rounded-[3rem] border-none bg-white shadow-premium overflow-hidden">
                    <CardHeader className="p-8">
                        <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-3 tracking-tight">
                            <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-premium">
                                <PieChartIcon className="h-5 w-5" />
                            </div>
                            Distribución por Categoría
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 pb-10">
                        <div className="h-[300px] w-full">
                            {isMounted && (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={8}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                            formatter={(value: any) => `$${value.toLocaleString('es-CO')}`}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            align="center"
                                            formatter={(value) => <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{value}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-[3rem] border-none bg-white shadow-premium overflow-hidden">
                    <CardHeader className="p-8">
                        <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-3 tracking-tight">
                            <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-premium">
                                <BarChart3 className="h-5 w-5" />
                            </div>
                            Top 5 Productos (Mayor Valor)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pb-10">
                        <div className="h-[300px] w-full">
                            {isMounted && (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topProductsData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                                            tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                            formatter={(value: any) => `$${value.toLocaleString('es-CO')}`}
                                        />
                                        <Bar dataKey="value" fill="#0f172a" radius={[10, 10, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Industrial Table */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                            <Package className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight italic">Libro de Valoración</h2>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Detalle por Artículo (Auditado)</p>
                        </div>
                    </div>

                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                        <Input
                            placeholder="Filtrar por nombre o SKU..."
                            className="h-14 pl-12 bg-white border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-200 focus-visible:ring-4 focus-visible:ring-primary/5 shadow-premium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <Card className="rounded-[3rem] border-none bg-white shadow-premium overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-100 hover:bg-transparent bg-slate-50/50">
                                        <TableHead className="py-6 pl-10 text-[10px] font-black uppercase text-slate-400 tracking-widest">ARTÍCULO</TableHead>
                                        <TableHead className="py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">CATEGORÍA</TableHead>
                                        <TableHead className="py-6 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">STOCK</TableHead>
                                        <TableHead className="py-6 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">COSTO PROM.</TableHead>
                                        <TableHead className="py-6 pr-10 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest font-black text-slate-900">VALOR TOTAL</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                                    <p className="text-slate-300 font-bold italic">Procesando auditoría patrimonial...</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-20 text-center text-slate-300 font-bold italic">
                                                No se encontraron activos en el periodo actual.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        data.map((item) => (
                                            <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50/80 transition-all group">
                                                <TableCell className="py-6 pl-10">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">{item.name}</span>
                                                        <span className="text-[10px] font-mono text-slate-300 uppercase tracking-tighter">{item.sku}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-6">
                                                    <Badge variant="outline" className="rounded-lg border-slate-200 text-slate-400 bg-white font-bold text-[9px] px-2 py-0.5 flex items-center gap-1 w-fit">
                                                        <Tag className="h-2 w-2" />
                                                        {item.category?.toUpperCase()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className="text-sm font-black text-slate-900">{Number(item.total_qty).toLocaleString('es-CO')}</span>
                                                        <span className="text-[10px] font-bold text-slate-300">UND</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-6 text-right">
                                                    <span className="text-sm font-bold text-slate-400 font-mono italic">
                                                        ${Number(item.avg_cost).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-6 pr-10 text-right">
                                                    <div className="flex items-center justify-end gap-2 group/val">
                                                        <span className="text-lg font-black text-slate-900 group-hover:text-emerald-600 transition-colors tracking-tighter">
                                                            ${Number(item.total_value).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                                                        </span>
                                                        <div className="h-6 w-6 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 opacity-0 group-hover/val:opacity-100 transition-all">
                                                            <ArrowUpRight className="h-3 w-3" />
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
