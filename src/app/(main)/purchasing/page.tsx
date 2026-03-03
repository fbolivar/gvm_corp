import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
    ShoppingBag,
    FileCheck,
    Users,
    Box,
    Plus,
    ArrowUpRight,
    Sparkles,
    TrendingDown,
    Truck,
    Clock,
    ChevronRight,
    ArrowRight,
    Zap,
    Cpu,
    Activity,
    LineChart,
    PackageCheck,
    ShieldCheck,
    LayoutDashboard,
    Calendar
} from "lucide-react"
import Link from "next/link"
import { documentService } from '@/features/documents/services/documentService';
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"
import { settingsService } from '@/features/settings/services/settingsService';

export default async function PurchasingDashboard() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    let orders: any[] = [];
    let bills: any[] = [];
    let latestVendors: any[] = [];
    let tenant: any = null;
    let error: string | null = null;

    try {
        const [ordersResult, billsResult, vendorsResult, tenantInfo] = await Promise.all([
            documentService.getDocuments(supabase, { page: 1, per_page: 50, type: 'PURCHASE_ORDER' as any }),
            documentService.getDocuments(supabase, { page: 1, per_page: 50, type: 'VENDOR_BILL' as any }),
            import('@/features/parties/services/partyService').then(m => m.partyService.getParties(supabase, { page: 1, per_page: 5, role: 'vendor' })),
            settingsService.getTenantInfo(supabase)
        ]);

        orders = ordersResult.data || [];
        bills = billsResult.data || [];
        latestVendors = vendorsResult.data || [];
        tenant = tenantInfo;
    } catch (err: any) {
        console.error("Error fetching purchasing data:", err);
        error = err.message || "Error al cargar datos de suministros";
    }

    const totalAP = bills
        .filter(doc => doc.status === 'SENT' || doc.status === 'DRAFT')
        .reduce((acc, doc) => acc + (Number(doc.total) || 0), 0);
    const pendingOrdersCount = orders.filter(o => o.status === 'SENT' || o.status === 'DRAFT').length;
    const receivedOrdersCount = orders.filter(o => o.status === 'ACCEPTED').length;
    const receptionRate = orders.length > 0 ? Math.round((receivedOrdersCount / orders.length) * 100) : 100;

    // Calculate Top Suppliers
    const vendorVolume = orders.reduce((acc: any, order) => {
        const name = (order as any).party?.legal_name || 'Desconocido';
        acc[name] = (acc[name] || 0) + (Number(order.total) || 0);
        return acc;
    }, {});

    const topVendors = Object.entries(vendorVolume)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 3);

    const stats = [
        {
            title: 'Órdenes Activas',
            count: orders.length,
            icon: ShoppingBag,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            link: '/purchasing/orders',
            desc: `${pendingOrdersCount} pendientes de recepción`
        },
        {
            title: 'Tasa Recepción',
            count: `${receptionRate}%`,
            icon: ShieldCheck,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            link: '/purchasing/orders',
            desc: 'Cumplimiento logístico'
        },
        {
            title: 'Cuentas x Pagar',
            count: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalAP),
            icon: TrendingDown,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
            link: '/purchasing/bills',
            desc: 'Saldo total obligaciones'
        },
    ];

    return (
        <div className="page-container space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* 🏎️ PREMIUM HEADER INDUSTRIAL V3 */}
            <div className="relative group overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active border border-white/5 mx-6 mt-6">
                {/* Decorative Layers */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-125 group-hover:rotate-12 transition-all duration-[2000ms]">
                    <Truck className="h-24 w-24 text-primary" />
                </div>
                <div className="absolute -bottom-24 -left-24 opacity-[0.02] pointer-events-none group-hover:scale-110 transition-transform duration-[3000ms]">
                    <Cpu className="h-[40rem] w-[40rem]" />
                </div>

                {/* Scanline Effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent h-1 w-full animate-scanline pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-16">
                    <div className="space-y-8">
                        <div className="flex items-center gap-6">
                            <div className="h-14 w-14 bg-amber-500 rounded-[1.5rem] flex items-center justify-center text-slate-950 shadow-active rotate-6 group-hover:rotate-0 transition-all duration-700">
                                <Sparkles className="h-8 w-8" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black uppercase tracking-[0.6em] text-amber-500 italic">Terminal de Suministros v3.2</span>
                                <div className="h-1 w-20 bg-amber-500/40 rounded-full mt-2" />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase leading-tight mb-4">
                                Cadena de <br /><span className="text-slate-600">Suministros</span>
                            </h1>
                            <div className="flex flex-wrap items-center gap-8">
                                <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-full border border-white/10 backdrop-blur-3xl shadow-active group/metric">
                                    <Activity className="h-4 w-4 text-amber-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.3em] italic">Flujo de Stock Activo: {receptionRate}%</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <p className="text-slate-500 font-black text-[11px] uppercase tracking-[0.5em] italic">Logística Operativa • 2026</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-8 w-full lg:w-auto">
                        <Button variant="ghost" asChild className="h-14 flex-1 lg:flex-none px-12 rounded-[2.5rem] border border-white/10 bg-white/5 hover:bg-white/10 text-white font-black hover:scale-105 transition-all shadow-active active:scale-95 group/btn relative overflow-hidden">
                            <Link href="/purchasing/vendors" className="flex items-center gap-6">
                                <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-amber-500 to-transparent translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                                <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center text-amber-500 group-hover/btn:scale-110 transition-transform relative z-10 border border-white/5">
                                    <Users className="h-8 w-8" />
                                </div>
                                <div className="flex flex-col items-start leading-none text-left relative z-10">
                                    <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-2 font-black italic">DIRECTORIO</span>
                                    <span className="text-2xl uppercase tracking-tighter italic font-black">PROVEEDORES</span>
                                </div>
                            </Link>
                        </Button>
                        <Button asChild className="h-14 flex-1 lg:flex-none px-14 rounded-[2.5rem] bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-active transition-all hover:scale-105 active:scale-95 border-none group/action relative overflow-hidden">
                            <Link href="/purchasing/orders/new" className="flex items-center gap-6">
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/action:translate-y-0 transition-transform duration-500" />
                                <div className="h-16 w-16 rounded-2xl bg-slate-950/20 flex items-center justify-center group-hover/action:scale-110 transition-transform relative z-10">
                                    <Plus className="h-10 w-10" />
                                </div>
                                <div className="flex flex-col items-start leading-none text-left relative z-10">
                                    <span className="text-[10px] uppercase tracking-[0.3em] text-slate-950/60 mb-2 font-black italic">OPERATIVA</span>
                                    <span className="text-2xl uppercase tracking-tighter italic font-black">NUEVA ORDEN</span>
                                </div>
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* 📊 INDUSTRIAL STAT CARDS V3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 px-6">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="border border-slate-100 bg-white shadow-premium rounded-[2.5rem] group hover:-translate-y-3 transition-all duration-700 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-125 transition-transform duration-1000">
                            <stat.icon className="h-24 w-24" />
                        </div>
                        <CardHeader className="flex flex-row items-center justify-between pb-8 pt-14 px-14 gap-6 relative z-10">
                            <div className={cn("h-14 w-14 rounded-[1.8rem] flex items-center justify-center shadow-active group-hover:rotate-12 transition-all duration-700", stat.bg, stat.color)}>
                                <stat.icon className="h-10 w-10" />
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] italic mb-2">{stat.title}</span>
                                <Badge className={cn("border-none px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest italic shadow-sm", stat.bg, stat.color)}>
                                    SISTEMA OK
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="px-14 pb-14 space-y-8 relative z-10">
                            <div className="space-y-3 text-center md:text-left">
                                <div className="text-4xl font-black text-slate-950 tracking-tight leading-tight group-hover:text-amber-600 transition-all duration-500 uppercase">
                                    {stat.count}
                                </div>
                                <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.5em] leading-relaxed max-w-[240px] italic">
                                    {stat.desc}
                                </p>
                            </div>
                            <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden p-[1px] shadow-inner">
                                <div
                                    className={cn("h-full rounded-full transition-all duration-1000 ease-out p-1 shadow-active", stat.color.replace('text-', 'bg-'))}
                                    style={{ width: '75%' }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start px-6">

                {/* 🤝 VENDOR ALLIANCE HUB */}
                <Card className="lg:col-span-4 border-none bg-white shadow-premium rounded-[2.5rem] p-4 relative overflow-hidden group">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none group-hover:scale-125 group-hover:-rotate-12 transition-all duration-1000">
                        <Users className="h-24 w-24 text-slate-950" />
                    </div>

                    <CardHeader className="p-14 pb-10 border-b border-slate-50 flex flex-col items-start gap-6 relative z-10">
                        <div className="h-16 w-16 bg-slate-950 rounded-[1.5rem] flex items-center justify-center text-amber-500 shadow-active group-hover:scale-110 transition-all duration-700">
                            <Users className="h-8 w-8" />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-slate-950 tracking-tight uppercase leading-tight">Aliados <br /><span className="text-slate-400">Estratégicos</span></h3>
                            <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.6em] mt-4 italic">Control de Alianzas</p>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 bg-slate-50/50 rounded-[3.5rem] mt-6 relative z-10">
                        <div className="space-y-4">
                            {latestVendors.map((vendor) => (
                                <div key={vendor.id} className="flex items-center justify-between p-8 rounded-[3rem] bg-white hover:bg-slate-950 transition-all duration-700 group/v shadow-premium border border-slate-100/50 hover:translate-x-2">
                                    <div className="flex items-center gap-8">
                                        <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/v:bg-white/10 group-hover/v:text-amber-500 transition-all shadow-inner group-hover/v:scale-110 border border-transparent group-hover/v:border-white/5">
                                            <Users className="h-8 w-8" />
                                        </div>
                                        <div className="flex flex-col">
                                            <p className="font-black text-slate-950 group-hover/v:text-white italic tracking-tighter text-2xl leading-none uppercase truncate w-32 md:w-44 transition-colors">{vendor.legal_name}</p>
                                            <div className="flex items-center gap-4 mt-3">
                                                <Badge className="bg-slate-100 group-hover/v:bg-white/10 text-slate-400 group-hover/v:text-amber-500/50 border-none text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest transition-colors italic">
                                                    {vendor.doc_number}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" asChild className="h-14 w-14 rounded-2xl text-slate-200 group-hover/v:text-amber-500 group-hover/v:bg-white/5 transition-all active:scale-90">
                                        <Link href={`/parties/${vendor.id}`}><ArrowUpRight className="h-8 w-8" /></Link>
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button variant="ghost" asChild className="w-full h-12 mt-8 rounded-[2rem] text-slate-400 hover:text-white hover:bg-slate-950 font-black uppercase tracking-[0.4em] text-[11px] transition-all italic">
                            <Link href="/purchasing/vendors" className="flex items-center justify-center gap-4">
                                EXPLORAR DIRECTORIO
                                <ArrowRight className="h-5 w-5" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* 📝 RECENT SUPPLY ACTIVITY */}
                <Card className="lg:col-span-8 bg-white border border-slate-100 shadow-premium rounded-[2.5rem] overflow-hidden group relative">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 p-20 opacity-[0.02] pointer-events-none group-hover:scale-125 group-hover:rotate-6 transition-all duration-[2000ms]">
                        <PackageCheck className="h-[30rem] w-[30rem] text-slate-950" />
                    </div>

                    <CardHeader className="p-14 pb-10 border-b border-slate-50 flex flex-col md:flex-row items-center justify-between gap-10 relative z-10">
                        <div className="flex items-center gap-10">
                            <div className="h-16 w-16 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center text-indigo-600 shadow-active group-hover:rotate-12 transition-all duration-700">
                                <PackageCheck className="h-8 w-8" />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-slate-950 tracking-tight uppercase leading-tight">Tráfico de <br /><span className="text-slate-400">Suministros</span></h3>
                                <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.6em] mt-4 italic">Protocolo Logístico</p>
                            </div>
                        </div>
                        <Button variant="outline" asChild className="h-12 px-12 rounded-[1.5rem] border-slate-100 text-slate-400 font-black uppercase text-[11px] tracking-[0.4em] hover:bg-slate-950 hover:text-white hover:border-slate-950 transition-all shadow-premium italic group/btn">
                            <Link href="/purchasing/orders" className="flex items-center gap-4">
                                PROTOCOLO COMPLETO
                                <ArrowRight className="h-5 w-5 group-hover/btn:translate-x-2 transition-transform" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-8 relative z-10">
                        <div className="space-y-4">
                            {orders.slice(0, 5).map((order) => (
                                <div key={order.id} className="p-10 hover:bg-slate-950 transition-all duration-700 flex flex-col md:flex-row items-center justify-between group/row rounded-[3rem] border border-transparent hover:border-white/5 shadow-sm hover:shadow-active hover:translate-y-[-4px]">
                                    <div className="flex items-center gap-10 w-full md:w-auto">
                                        <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover/row:bg-white/10 group-hover/row:text-primary group-hover/row:rotate-[15deg] group-hover/row:scale-110 transition-all duration-700 shadow-inner">
                                            <ShoppingBag className="h-8 w-8" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-4">
                                                <span className="text-2xl font-black text-slate-950 group-hover/row:text-white font-mono tracking-tighter italic uppercase transition-colors">#{order.number}</span>
                                                <Badge className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-black uppercase tracking-widest px-4 py-1 rounded-full italic shadow-sm group-hover/row:bg-white group-hover/row:text-slate-950 transition-all">
                                                    {order.status}
                                                </Badge>
                                            </div>
                                            <h4 className="font-black text-slate-400 group-hover/row:text-slate-500 uppercase italic text-[13px] tracking-tight truncate w-full md:w-80 leading-none transition-colors">{order.party?.legal_name || 'PROVEEDOR NO VINCULADO'}</h4>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-16 mt-8 md:mt-0 w-full md:w-auto justify-between md:justify-end">
                                        <div className="flex flex-col items-end gap-1">
                                            <p className="text-4xl font-black text-slate-950 group-hover/row:text-white font-mono tracking-tighter italic leading-none transition-colors">${Number(order.total).toLocaleString('es-CO')}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <Calendar className="h-3.5 w-3.5 text-slate-300 group-hover/row:text-primary transition-colors" />
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] italic">Emisión: {order.issue_date}</p>
                                            </div>
                                        </div>
                                        <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-slate-200 group-hover/row:text-primary group-hover/row:bg-white/5 transition-all group-hover/row:translate-x-2">
                                            <ChevronRight className="h-10 w-10" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 🤖 SMART PURCHASING AGENT V3 */}
            <div className="px-6">
                <Card className="bg-slate-950 border border-white/5 shadow-active rounded-[2.5rem] p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-20 opacity-[0.06] pointer-events-none group-hover:scale-150 transition-transform duration-[3000ms]">
                        <Cpu className="h-[25rem] w-[25rem] text-amber-500" />
                    </div>
                    <div className="absolute -bottom-24 -left-24 opacity-[0.04] pointer-events-none group-hover:scale-110 transition-transform duration-[3000ms]">
                        <Zap className="h-[35 rem] w-[35rem] text-white" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 p-10 relative z-10">
                        <div className="space-y-12">
                            <div className="space-y-8">
                                <div className="flex items-center gap-8">
                                    <div className="h-16 w-16 rounded-[1.8rem] bg-amber-500 flex items-center justify-center text-slate-950 shadow-active rotate-12 group-hover:rotate-[24deg] transition-all duration-700">
                                        <Sparkles className="h-10 w-10" />
                                    </div>
                                    <div>
                                        <h2 className="text-4xl font-black text-white tracking-tight uppercase leading-tight">Smart <br /><span className="text-amber-500">Purchasing</span></h2>
                                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.6em] mt-4 italic">Unidad de IA Predictiva</p>
                                    </div>
                                </div>
                                <p className="text-slate-400 font-bold text-2xl leading-relaxed max-w-xl italic">
                                    Sincronizando flujo de caja con puntos de reorden crítico. Nuestra IA analiza tiempos de entrega y tasas de consumo para maximizar tu <span className="text-white">liquidez operativa</span> en tiempo real.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-8">
                                <Button asChild className="h-14 px-12 rounded-[2rem] bg-white text-slate-950 font-black text-sm uppercase tracking-[0.3em] hover:bg-amber-500 hover:text-white transition-all group/btn shadow-active border-none italic">
                                    <Link href="/purchasing/bills/new" className="flex items-center justify-center">
                                        CARGAR GASTO DIRECTO
                                        <ArrowRight className="ml-6 h-6 w-6 group-hover/btn:translate-x-3 transition-transform" />
                                    </Link>
                                </Button>
                                <div className="h-14 px-10 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-3xl flex items-center gap-6 shadow-active group/sec">
                                    <ShieldCheck className="h-8 w-8 text-emerald-500 group-hover/sec:scale-110 transition-transform" />
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-white uppercase tracking-[0.4em] italic uppercase">PROTOCOLO SEGURO</span>
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1 italic">ENCRYPTED STREAM V3.2</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                            <div className="p-12 rounded-[3.5rem] bg-white/5 border border-white/5 backdrop-blur-3xl flex flex-col gap-8 hover:bg-white/10 transition-all duration-700 border-l-8 border-l-amber-500 group/item relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-10 opacity-[0.05] pointer-events-none group-hover/item:scale-125 transition-transform duration-1000">
                                    <Truck className="h-32 w-32 text-amber-500" />
                                </div>
                                <div className="h-20 w-20 rounded-[1.5rem] bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover/item:rotate-12 transition-all duration-700 shadow-inner relative z-10">
                                    <Truck className="h-10 w-10" />
                                </div>
                                <div className="space-y-3 relative z-10">
                                    <p className="text-2xl font-black text-white leading-tight uppercase italic">Reposición <br />Proactiva</p>
                                    <p className="text-[12px] text-slate-500 font-black uppercase tracking-widest leading-relaxed italic">Sugerencias automáticas basadas en proyecciones de demanda.</p>
                                </div>
                            </div>

                            <div className="p-12 rounded-[3.5rem] bg-white/5 border border-white/5 backdrop-blur-3xl flex flex-col gap-8 hover:bg-white/10 transition-all duration-700 border-l-8 border-l-indigo-500 group/item relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-10 opacity-[0.05] pointer-events-none group-hover/item:scale-125 transition-transform duration-1000">
                                    <LineChart className="h-32 w-32 text-indigo-500" />
                                </div>
                                <div className="h-20 w-20 rounded-[1.5rem] bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover/item:-rotate-12 transition-all duration-700 shadow-inner relative z-10">
                                    <LineChart className="h-10 w-10" />
                                </div>
                                <div className="space-y-3 relative z-10">
                                    <p className="text-2xl font-black text-white leading-tight uppercase italic">Ciclo de <br />Caja</p>
                                    <p className="text-[12px] text-slate-500 font-black uppercase tracking-widest leading-relaxed italic">Tiempo de recepción: <span className="text-white font-black underline decoration-indigo-500/30">4.2 Días</span>.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* 🛡️ AUDIT FOOTER INDUSTRIAL V3 */}
            <div className="px-6 mb-12">
                <div className="bg-slate-950 p-10 rounded-[2.5rem] text-white flex flex-col lg:flex-row items-center justify-between gap-12 shadow-active relative overflow-hidden group border border-white/5">
                    {/* Background decoration */}
                    <div className="absolute inset-0 opacity-[0.02] bg-grid-white pointer-events-none" />

                    <div className="flex flex-col lg:flex-row items-center gap-12 relative z-10 w-full lg:w-auto">
                        <div className="h-14 w-14 bg-white/5 p-4 rounded-[2rem] border border-white/10 flex items-center justify-center group-hover:rotate-[360deg] transition-transform duration-[2000ms] shadow-active">
                            <ShieldCheck className="h-12 w-12 text-primary animate-pulse" />
                        </div>
                        <div className="space-y-3 text-center lg:text-left">
                            <h4 className="text-2xl font-black tracking-tight uppercase leading-tight">Blindaje de Operaciones</h4>
                            <p className="text-slate-500 font-extrabold text-[11px] uppercase tracking-[0.6em] italic">Cada transacción en esta terminal está auditada y certificada bajo el Protocolo Fiscal v3.2.</p>
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-wrap justify-center gap-8">
                        <div className="flex flex-col items-center lg:items-end">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2 italic">ESTADO DEL NODO</span>
                            <Badge className="bg-primary/20 text-primary border border-primary/30 px-8 py-2.5 rounded-full font-black text-[11px] uppercase tracking-[0.5em] italic shadow-active animate-pulse">
                                SISTEMA ÍNTEGRO
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
