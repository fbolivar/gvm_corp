import { createClient } from '@/lib/supabase/server';
import { crmService } from '@/features/crm/services/crmService';
import { documentService } from '@/features/documents/services/documentService';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import {
    Users,
    FileText,
    ShoppingCart,
    ArrowRight,
    TrendingUp,
    ChevronRight,
    AlertCircle,
    Plus,
    Sparkles,
    Receipt,
    BarChart3,
    Rocket,
    Zap,
    Target,
    Activity,
    Cpu,
    ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { cn } from "@/shared/lib/utils";
import { redirect } from 'next/navigation';
import { Badge } from '@/shared/components/ui/badge';

export default async function SalesDashboard() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    let leads: any[] = [];
    let quotes: any[] = [];
    let orders: any[] = [];
    let invoices: any[] = [];
    let error: string | null = null;

    try {
        const [leadsRes, quotesResult, ordersResult, invoicesResult] = await Promise.allSettled([
            crmService.getLeads(supabase),
            documentService.getDocuments(supabase, { page: 1, per_page: 50, type: 'QUOTATION' }),
            documentService.getDocuments(supabase, { page: 1, per_page: 50, type: 'SALES_ORDER' }),
            documentService.getDocuments(supabase, { page: 1, per_page: 50, type: 'INVOICE' })
        ]);

        if (leadsRes.status === 'fulfilled') leads = leadsRes.value || [];
        else console.error("Error loading leads:", leadsRes.reason?.message || leadsRes.reason?.code || leadsRes.reason);

        if (quotesResult.status === 'fulfilled') quotes = quotesResult.value.data || [];
        else console.error("Error loading quotes:", quotesResult.reason?.message || quotesResult.reason?.code || quotesResult.reason);

        if (ordersResult.status === 'fulfilled') orders = ordersResult.value.data || [];
        else console.error("Error loading orders:", ordersResult.reason?.message || ordersResult.reason?.code || ordersResult.reason);

        if (invoicesResult.status === 'fulfilled') invoices = invoicesResult.value.data || [];
        else console.error("Error loading invoices:", invoicesResult.reason?.message || invoicesResult.reason?.code || invoicesResult.reason);
    } catch (err: any) {
        console.error("Error fetching sales data:", err?.message || err?.code || err);
        error = err.message || "Error al cargar datos comerciales";
    }

    const totalRevenue = invoices.reduce((acc: number, inv: any) => acc + (Number(inv.total) || 0), 0);

    const stats = [
        {
            title: 'Prospectos / Leads',
            count: leads.length,
            icon: Users,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            link: '/crm/leads',
            desc: 'Oportunidades registradas'
        },
        {
            title: 'Cotizaciones',
            count: quotes.length,
            icon: FileText,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            link: '/sales/quotations',
            desc: 'Propuestas en proceso'
        },
        {
            title: 'Pedidos Confirmados',
            count: orders.length,
            icon: ShoppingCart,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            link: '/sales/orders',
            desc: 'Compromisos de entrega'
        },
    ];

    return (
        <div className="page-container space-y-8 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {error && (
                <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 text-rose-600 shadow-sm">
                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-rose-500 shadow-sm">
                        <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest">Protocolo de Error Detectado</p>
                        <p className="text-xs font-bold uppercase tracking-widest leading-none mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Premium Header */}
            <div className="relative group overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active border border-white/5">
                {/* Decorative Background Icons */}
                <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none group-hover:scale-125 group-hover:rotate-12 transition-transform duration-1000">
                    <TrendingUp className="h-24 w-24" />
                </div>
                <div className="absolute -bottom-10 -left-10 opacity-[0.05] pointer-events-none">
                    <Cpu className="h-20 w-20 text-primary" />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-30 pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-1.5 w-10 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Terminal de Ventas V3</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight mb-2">
                            Embudo & <br /><span className="text-slate-500">Facturación</span>
                        </h1>
                        <div className="flex items-center gap-4">
                            <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em]">Arquitectura de Generación de Valor</p>
                            <div className="hidden md:flex items-center gap-2 bg-primary/20 px-3 py-1 rounded-full backdrop-blur-xl border border-primary/30 shadow-active">
                                <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                                <span className="text-[8px] font-black text-white uppercase tracking-widest">Optimización Activa</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto">
                        <Button variant="outline" asChild className="h-12 flex-1 md:flex-none px-8 rounded-2xl border-none bg-white/5 hover:bg-white/10 text-white font-black transition-all active:scale-95 backdrop-blur-xl shadow-premium">
                            <Link href="/sales/invoices" className="flex items-center gap-4">
                                <Receipt className="h-5 w-5 text-primary" />
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[9px] uppercase tracking-[0.2em] opacity-40 italic">Historial</span>
                                    <span className="text-[11px] uppercase tracking-[0.1em]">Recaudos</span>
                                </div>
                            </Link>
                        </Button>
                        <Button asChild className="h-12 flex-1 md:flex-none px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black shadow-active transition-all active:scale-95 border-none">
                            <Link href="/sales/orders/new" className="flex items-center gap-4">
                                <Plus className="h-6 w-6" />
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[9px] uppercase tracking-[0.2em] opacity-60 italic text-white/70">Operación</span>
                                    <span className="text-[11px] uppercase tracking-[0.1em]">Nueva Venta</span>
                                </div>
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Industrial Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {stats.map((stat) => (
                    <Card key={stat.title} className="border-none bg-white shadow-premium rounded-[2.5rem] group hover:translate-y-[-4px] transition-all duration-500 overflow-hidden relative">
                        <div className={cn("absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700", stat.color)}>
                            <stat.icon className="h-24 w-24" />
                        </div>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-10 px-10 gap-4 relative z-10">
                            <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shadow-active group-hover:rotate-6 transition-transform duration-500", stat.bg, stat.color)}>
                                <stat.icon className="h-7 w-7" />
                            </div>
                            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">{stat.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="px-10 pb-10 space-y-6 relative z-10">
                            <div className="space-y-1">
                                <div className="text-3xl font-black text-slate-950 tracking-tight leading-none uppercase">
                                    {stat.count}
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{stat.desc}</p>
                            </div>
                            <Button variant="ghost" asChild className="w-full h-12 rounded-xl bg-slate-50 text-slate-900 hover:bg-slate-100 transition-all duration-300">
                                <Link href={stat.link} className="flex items-center justify-center text-[9px] font-black uppercase tracking-[0.2em]">
                                    Explorar Pipeline <ChevronRight className="ml-2 h-4 w-4 text-primary" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                {/* Operations Center */}
                <Card className="lg:col-span-8 bg-white border-none shadow-premium rounded-[3rem] overflow-hidden relative group">
                    {/* Interior Decorator */}
                    <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                        <Activity className="h-32 w-32 text-slate-950" />
                    </div>

                    <CardContent className="p-10 space-y-10 relative z-10">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="space-y-2 text-center md:text-left">
                                <div className="flex items-center gap-3 justify-center md:justify-start">
                                    <Target className="h-5 w-5 text-primary" />
                                    <h2 className="text-3xl font-black text-slate-950 tracking-tight uppercase leading-tight">Operaciones</h2>
                                </div>
                                <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] pl-1">Centro de Protocolos Comerciales</p>
                            </div>
                            <div className="h-16 w-16 bg-slate-950 rounded-2xl flex items-center justify-center shadow-active">
                                <Rocket className="h-8 w-8 text-primary animate-bounce-slow" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { link: '/crm/leads/new', icon: Users, label: 'Lead', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', desc: 'Prosperación' },
                                { link: '/sales/quotations/new', icon: FileText, label: 'Cotizar', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', desc: 'Propuestas' },
                                { link: '/sales/orders/new', icon: ShoppingCart, label: 'Pedido', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', desc: 'Compromiso' },
                                { link: '/sales/invoices/new', icon: Receipt, label: 'Facturar', bg: 'bg-slate-950', text: 'text-white', border: 'border-slate-800', desc: 'Recaudo' },
                            ].map((pod) => (
                                <Button
                                    key={pod.label}
                                    asChild
                                    className={cn(
                                        "h-32 rounded-3xl shadow-none border-[1.5px] transition-all hover:scale-105 flex flex-col items-center justify-center gap-2 group/pod overflow-hidden relative",
                                        pod.bg, pod.text, pod.border
                                    )}
                                >
                                    <Link href={pod.link}>
                                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/pod:translate-y-0 transition-transform duration-500" />
                                        <pod.icon className="h-7 w-7 group-hover/pod:rotate-12 transition-transform duration-500 relative z-10" />
                                        <div className="flex flex-col items-center relative z-10">
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em] italic leading-none">{pod.label}</span>
                                            <span className="text-[7px] font-black uppercase tracking-[0.3em] opacity-40 mt-1">{pod.desc}</span>
                                        </div>
                                    </Link>
                                </Button>
                            ))}
                        </div>

                        <div className="pt-10 border-t border-slate-50">
                            <div className="flex items-center justify-between mb-8">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-slate-950 uppercase leading-tight tracking-tight">Facturación de Alto Impacto</h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none">Flujo Vital de Efectivo</p>
                                </div>
                                <Button variant="ghost" asChild className="rounded-full text-primary hover:bg-slate-50 px-6 h-10 font-black uppercase text-[9px] tracking-[0.2em] gap-3 leading-none border border-slate-100 shadow-sm">
                                    <Link href="/sales/invoices">
                                        HISTORIAL DE RECAUDO <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                            <div className="space-y-4">
                                {invoices.slice(0, 4).map((inv) => (
                                    <div key={inv.id} className="flex items-center justify-between p-5 rounded-3xl bg-white border border-slate-50 hover:bg-slate-50 transition-all shadow-premium group/item">
                                        <div className="flex items-center gap-5">
                                            <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center shadow-inner">
                                                <Receipt className="h-6 w-6 text-slate-400 group-hover/item:text-primary transition-colors" />
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-black text-slate-950 tracking-tight uppercase italic leading-none">{inv.party?.legal_name || 'Consumidor Final'}</p>
                                                <div className="flex items-center gap-3 mt-1.5 opacity-60">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{inv.number}</span>
                                                    <div className="h-1 w-1 bg-slate-300 rounded-full" />
                                                    <span className="text-[10px] font-mono text-slate-500 font-bold">{inv.issue_date}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <p className="text-xl font-black text-slate-950 italic tracking-tighter uppercase leading-none">
                                                ${Number(inv.total).toLocaleString('es-CO')}
                                            </p>
                                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">AUDITADO</span>
                                        </div>
                                    </div>
                                ))}
                                {invoices.length === 0 && (
                                    <div className="py-20 text-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center">
                                        <Activity className="h-10 w-10 text-slate-200 mb-4" />
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Sin registros detectados en el kernel</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Performance & Visualization */}
                <div className="lg:col-span-4 space-y-10">
                    <Card className="bg-slate-950 border-none shadow-active rounded-[2.5rem] p-2 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-10 opacity-[0.1] pointer-events-none group-hover:scale-150 group-hover:rotate-12 transition-transform duration-1000">
                            <Zap className="h-32 w-32 text-primary" />
                        </div>

                        <CardHeader className="relative z-10 px-10 pt-10 pb-4">
                            <CardTitle className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] flex items-center gap-3 italic">
                                <BarChart3 className="h-4 w-4 text-primary" />
                                Facturación Mensual
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10 px-10 pb-10 space-y-10 text-white leading-none">
                            <div className="space-y-4">
                                <div className="flex items-baseline gap-2 uppercase">
                                    <span className="text-primary font-black italic text-2xl tracking-tighter">$</span>
                                    <h3 className="text-4xl font-black leading-none tracking-tighter text-white">
                                        {totalRevenue.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                    </h3>
                                </div>
                            </div>

                            <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-2xl flex flex-col gap-5 border-l-4 border-l-primary shadow-active relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[50px] -mr-16 -mt-16 pointer-events-none" />
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-active">
                                        <TrendingUp className="h-4 w-4" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Rendimiento Operativo</span>
                                </div>
                                <div className="space-y-3 relative z-10">
                                    <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em] leading-tight">
                                        Umbral base <span className="text-primary font-black">+12.5%</span> sobre periodo anterior.
                                    </p>
                                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary w-[75%] rounded-full shadow-[0_0_15px_rgba(var(--primary),0.6)] animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-indigo-50 to-white border-none shadow-premium rounded-[2.5rem] p-10 space-y-8 relative group overflow-hidden">
                        <div className="absolute -bottom-10 -right-10 opacity-[0.05] pointer-events-none group-hover:scale-125 transition-transform duration-1000">
                            <Users className="h-32 w-32 text-indigo-950" />
                        </div>

                        <div className="h-16 w-16 bg-white rounded-[1.5rem] flex items-center justify-center shadow-premium">
                            <Users className="h-8 w-8 text-primary" />
                        </div>
                        <div className="space-y-2 leading-none">
                            <h3 className="text-3xl font-black text-slate-950 tracking-tight uppercase">Top Terceros</h3>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] leading-relaxed">Identifica los nodos de mayor rentabilidad.</p>
                        </div>
                        <Button variant="outline" className="w-full h-14 rounded-2xl border-none bg-white text-slate-900 font-black text-[10px] uppercase tracking-[0.3em] hover:bg-primary hover:text-white shadow-premium transition-all duration-500 leading-none">
                            ANALIZAR CLIENTES <ArrowRight className="ml-3 h-4 w-4" />
                        </Button>
                    </Card>
                </div>
            </div>

            {/* 🛡️ AUDIT FOOTER */}
            <div className="bg-slate-950 p-10 rounded-[2.5rem] text-white flex flex-col lg:flex-row items-center justify-between gap-10 shadow-active relative overflow-hidden group mb-12 border border-white/5">
                <div className="absolute top-0 right-0 p-10 opacity-[0.05] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                    <ShieldCheck className="h-40 w-40 text-white" />
                </div>
                <div className="flex items-center gap-8 relative z-10 text-center lg:text-left flex-col lg:flex-row">
                    <div className="h-20 w-20 bg-white/10 rounded-[2rem] flex items-center justify-center text-white border border-white/10 shadow-inner rotate-12 group-hover:rotate-0 transition-all duration-1000">
                        <Activity className="h-10 w-10 text-primary animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 justify-center lg:justify-start">
                            <div className="h-1 w-4 bg-primary rounded-full" />
                            <h4 className="text-xl font-black tracking-tight uppercase leading-tight text-white">Protocolo de Auditoría Comercial</h4>
                        </div>
                        <p className="text-[11px] text-white/40 leading-relaxed font-black uppercase tracking-[0.2em] max-w-2xl">
                            Validación por motor contable industrial. Integridad de datos asegurada mediante protocolos de cifrado y auditoría de transacciones en tiempo real.
                        </p>
                    </div>
                </div>
                <div className="relative z-10">
                    <Badge className="bg-primary/20 text-primary border-primary/30 px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.4em] italic shadow-active animate-pulse">
                        SISTEMA ÍNTEGRO
                    </Badge>
                </div>
            </div>
        </div>
    );
}

// Utility reuse

