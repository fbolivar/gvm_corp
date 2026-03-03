import { createClient } from '@/lib/supabase/server';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import { settingsService } from '@/features/settings/services/settingsService';
import { ReportingFilters } from '@/features/accounting/components/ReportingFilters';
import { ReportExportActions } from '@/features/accounting/components/ReportExportActions';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Package2, TrendingUp, Info, ShieldCheck, Sparkles, ArrowDownRight, Box, Activity, ArrowRight, Zap } from "lucide-react";
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils";
import { Button } from '@/shared/components/ui/button';

export default async function InventoryValuationPage({
    searchParams
}: {
    searchParams: Promise<{ search?: string }>
}) {
    const supabase = await createClient();
    const params = await searchParams;
    const search = params.search || '';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [data, tenant] = await Promise.all([
        inventoryService.getValuation(supabase, search),
        settingsService.getTenantInfo(supabase)
    ]);

    const totalValuation = data.reduce((acc, curr) => acc + (Number(curr.total_value) || 0), 0);

    return (
        <div className="page-container space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* 💎 PREMIUM HEADER */}
            <VisualReportHeader
                title="Valoración Maestría"
                subtitle="Costo Promedio Ponderado - NIIF Standard"
                tenant={tenant}
            />

            {/* 📊 INDUSTRIAL STRIP (Global Inventory Stake) */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-10 px-1">
                <div className="flex flex-wrap items-center gap-16">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">Capital en Inventario</span>
                        <div className="flex items-center gap-6">
                            <h2 className="text-4xl font-black text-slate-900 tracking-tight tabular-nums leading-none">
                                ${totalValuation.toLocaleString('es-CO')}
                            </h2>
                            <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm group hover:scale-110 transition-transform">
                                <TrendingUp className="h-7 w-7" />
                            </div>
                        </div>
                    </div>
                    <div className="h-24 w-[1px] bg-slate-100 hidden lg:block" />
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">Unidades Valuadas</span>
                        <div className="flex items-baseline gap-4">
                            <span className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">{data.length}</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg">Items Activos</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <ReportingFilters />
                    <div className="h-14 border-l border-slate-100 mx-2 hidden md:block" />
                    <ReportExportActions
                        title="Valoración de Inventario"
                        companyName={tenant?.name || 'GVM S.A.S'}
                        companyNit={tenant?.nit}
                        companyAddress={tenant?.address}
                        companyPhone={tenant?.phone}
                        period={new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).toUpperCase()}
                        sections={[
                            {
                                title: 'Artículos en Existencia',
                                rows: data.map(d => ({ name: d.product_name, amount: d.total_value })),
                                total: totalValuation
                            }
                        ]}
                        rawData={data.map(d => ({
                            Producto: d.product_name,
                            Código: d.sku,
                            Cantidad: d.total_qty,
                            Costo_Promedio: d.avg_cost,
                            Valor_Total: d.total_value
                        }))}
                        fileName="Valoracion_Inventario"
                    />
                </div>
            </div>

            {/* 🏗️ MAIN DATA POD */}
            <Card className="rounded-[2.5rem] border-none bg-white shadow-premium overflow-hidden group">
                <CardHeader className="py-10 px-14 border-b border-slate-50 bg-slate-50/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            <div className="h-14 w-14 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white shadow-active transition-transform group-hover:rotate-6 duration-700">
                                <Box className="h-10 w-10" />
                            </div>
                            <div>
                                <CardTitle className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">
                                    Liquidación de Stock
                                </CardTitle>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-3 underline decoration-slate-200 underline-offset-4">Reporte maestro de auditoría forense de mercancías</p>
                            </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-4 bg-white px-8 py-4 rounded-3xl border border-slate-100 shadow-active">
                            <ShieldCheck className="h-5 w-5 text-indigo-500" />
                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Protocolo Seguro v3</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto overflow-y-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-50 hover:bg-transparent bg-slate-50/50">
                                    <TableHead className="py-8 pl-14 text-[10px] font-black uppercase text-slate-400 tracking-[0.5em] italic">Product Hierarchy</TableHead>
                                    <TableHead className="py-8 text-center text-[10px] font-black uppercase text-slate-400 tracking-[0.5em] italic">Physical Stake</TableHead>
                                    <TableHead className="py-8 text-right text-[10px] font-black uppercase text-slate-400 tracking-[0.5em] italic">Avg Unit Cost</TableHead>
                                    <TableHead className="py-8 text-right pr-14 text-[10px] font-black uppercase text-slate-400 tracking-[0.5em] italic">Total Asset Valuation</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((item, idx) => (
                                    <TableRow key={`${item.product_id}-${idx}`} className="border-slate-50 hover:bg-indigo-50/20 transition-all group/row">
                                        <TableCell className="py-10 pl-14">
                                            <div className="flex items-center gap-6">
                                                <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-slate-400 group-hover/row:text-primary transition-all border border-slate-100 shadow-sm shadow-slate-100/50">
                                                    <Package2 className="h-6 w-6" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <p className="font-black text-slate-900 text-lg group-hover/row:text-primary transition-colors italic tracking-tighter uppercase leading-none">{item.product_name}</p>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] px-3 py-1 bg-slate-900 text-white rounded-md font-black font-mono uppercase tracking-widest">
                                                            {item.sku || 'MOD-CORE'}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">Item Verificado</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-10 text-center">
                                            <div className="inline-flex flex-col items-center px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100 group-hover/row:bg-white transition-all shadow-inner">
                                                <span className="text-xl font-black text-slate-900 font-mono tracking-tighter italic">
                                                    {Number(item.total_qty).toLocaleString()}
                                                </span>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mt-2">Existencias</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-10 text-right">
                                            <span className="text-base font-bold text-slate-400 font-mono italic tracking-tighter">
                                                ${Number(item.avg_cost).toLocaleString()}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-10 text-right pr-14">
                                            <div className="flex items-baseline justify-end gap-3 transition-transform group-hover/row:translate-x-[-4px]">
                                                <span className="text-2xl font-black text-slate-900 font-mono tracking-tighter italic leading-none group-hover/row:text-primary transition-colors">
                                                    ${Number(item.total_value).toLocaleString()}
                                                </span>
                                                <ArrowDownRight className="h-4 w-4 text-emerald-500 opacity-0 group-hover/row:opacity-100 transition-opacity" />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {data.length === 0 && (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={4} className="py-48 text-center">
                                            <div className="flex flex-col items-center gap-10 opacity-60">
                                                <div className="h-32 w-32 rounded-[2.5rem] bg-slate-50 flex items-center justify-center border-8 border-white shadow-premium">
                                                    <Activity className="h-14 w-14 text-slate-200" />
                                                </div>
                                                <div className="space-y-3">
                                                    <p className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">Bodega Silenciosa</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">No se detectaron activos tangibles bajo custodia</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* 🛡️ BOTTOM INFRASTRUCTURE pods */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-active relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.05] pointer-events-none group-hover:rotate-12 transition-transform">
                        <Zap className="h-20 w-20" />
                    </div>
                    <div className="flex items-center gap-10 relative z-10">
                        <div className="h-14 w-14 bg-white/10 rounded-[2.5rem] flex items-center justify-center border border-white/10 shadow-inner group-hover:-rotate-6 transition-transform">
                            <TrendingUp className="h-10 w-10 text-amber-400" />
                        </div>
                        <div className="space-y-3">
                            <h4 className="text-2xl font-black uppercase tracking-tight leading-tight">Liquidez en Stock</h4>
                            <p className="text-sm text-white/40 leading-relaxed font-medium pr-10">
                                Este reporte representa el valor realizable de inventarios, base crucial para el cálculo de capital de trabajo operativo según metodología NIIF.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-10 rounded-[2.5rem] shadow-premium flex flex-col md:flex-row items-center justify-between gap-10 border border-slate-50 group">
                    <div className="flex items-center gap-8">
                        <div className="h-14 w-14 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 shadow-inner">
                            <Info className="h-8 w-8" />
                        </div>
                        <div className="space-y-1">
                            <h5 className="text-slate-900 font-black text-lg uppercase tracking-tight">Sincronía Contable</h5>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Cruce automático con la cuenta 1435: <span className="text-indigo-400">Verificada</span></p>
                        </div>
                    </div>
                    <Button variant="outline" className="h-14 bg-white border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest px-10 hover:shadow-active transition-all group">
                        Inspección Completa <ArrowRight className="ml-4 h-4 w-4 group-hover:translate-x-2 transition-transform" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
