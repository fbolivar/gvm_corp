import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/features/documents/services/documentService';
import { SalesInvoiceList } from '@/features/sales/components/SalesInvoiceList';
import { Button } from "@/shared/components/ui/button"
import { Plus, Receipt, Sparkles, Activity, ShieldCheck, Banknote, RefreshCw } from "lucide-react"
import Link from "next/link"
import { redirect } from 'next/navigation';
import { settingsService } from '@/features/settings/services/settingsService';
import { cn } from "@/shared/lib/utils";

export default async function InvoicesPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [{ data }, tenant] = await Promise.all([
        documentService.getDocuments(supabase, {
            page: 1,
            per_page: 50,
            type: 'INVOICE' as any
        }),
        settingsService.getTenantInfo(supabase)
    ]);

    const invoices = data || [];
    const totalInvoiced = invoices.reduce((acc: number, inv: any) => acc + (Number(inv.total) || 0), 0);
    const pendingCollection = invoices.filter((inv: any) => inv.status !== 'PAID').length;

    return (
        <div className="page-container space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* 🏭 PREMIUM HEADER DARK */}
            <div className="relative group overflow-hidden bg-slate-950 rounded-[4rem] p-16 text-white shadow-active">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                    <Receipt className="h-64 w-64 text-white" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-10 bg-blue-500 rounded-full" />
                            <span className="text-xs font-black uppercase tracking-[0.5em] text-blue-500">Documentación Electrónica</span>
                        </div>
                        <h1 className="text-7xl font-black tracking-tighter italic uppercase leading-[0.8]">
                            Cartera & <br /><span className="text-slate-500">Facturación</span>
                        </h1>
                        <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.4em]">Liquidación de Ingresos & CXC (v3.0)</p>
                    </div>

                    <div className="flex gap-4">
                        <Button variant="outline" asChild className="h-20 px-10 rounded-[2rem] border-none bg-white/5 hover:bg-white/10 text-white font-black hover:scale-105 transition-all backdrop-blur-md">
                            <Link href="/sales/recurring" className="flex items-center gap-4">
                                <RefreshCw className="h-6 w-6 text-violet-400" />
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[10px] uppercase tracking-widest opacity-40">Automático</span>
                                    <span className="text-xs uppercase tracking-widest">Recurrentes</span>
                                </div>
                            </Link>
                        </Button>
                        <Button variant="outline" asChild className="h-20 px-10 rounded-[2rem] border-none bg-white/5 hover:bg-white/10 text-white font-black hover:scale-105 transition-all backdrop-blur-md">
                            <Link href="/sales" className="flex items-center gap-4">
                                <Sparkles className="h-6 w-6 text-indigo-400" />
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[10px] uppercase tracking-widest opacity-40">Métricas</span>
                                    <span className="text-xs uppercase tracking-widest">Dashboard</span>
                                </div>
                            </Link>
                        </Button>
                        <Button asChild className="h-20 px-12 rounded-[2rem] bg-primary hover:bg-primary/90 text-white font-black shadow-active transition-all hover:scale-105 active:scale-95 border-none">
                            <Link href="/sales/invoices/new" className="flex items-center gap-4">
                                <Plus className="h-7 w-7" />
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[10px] uppercase tracking-widest opacity-60">Operación</span>
                                    <span className="text-xs uppercase tracking-widest">Nueva Factura</span>
                                </div>
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* 📊 SUMMARY STRIP */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { label: 'Volumen Facturado', value: `$${totalInvoiced.toLocaleString('es-CO')}`, icon: Banknote, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Facturas por Cobrar', value: pendingCollection, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Flujo Esperado', value: '88.4%', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-premium flex items-center gap-6 border border-slate-50 hover:border-blue-100 transition-colors group">
                        <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-6", stat.bg, stat.color)}>
                            <stat.icon className="h-8 w-8" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{stat.label}</p>
                            <p className="text-3xl font-black text-slate-900 tracking-tighter italic">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* 📝 LISTING BLOCK */}
            <div className="space-y-6">
                <div className="flex items-center gap-4 px-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter italic uppercase">Registro de Cartera Electrónica</h3>
                </div>
                <div className="bg-white rounded-[3.5rem] shadow-premium p-4 md:p-8 overflow-hidden">
                    <SalesInvoiceList invoices={invoices} />
                </div>
            </div>

            {/* 🛡️ AUDIT FOOTER */}
            <div className="bg-slate-950 p-16 rounded-[4rem] text-white flex flex-col lg:flex-row items-center justify-between gap-12 shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                    <ShieldCheck className="h-48 w-48 text-white" />
                </div>
                <div className="flex items-center gap-10 relative z-10 text-center lg:text-left flex-col lg:flex-row">
                    <div className="h-20 w-20 bg-white/10 rounded-[2rem] flex items-center justify-center text-white border border-white/10 shadow-inner rotate-12 group-hover:rotate-0 transition-transform duration-700">
                        <Banknote className="h-10 w-10 text-blue-400" />
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-2xl font-black italic tracking-tighter uppercase leading-none text-white">Consolidación de Ingresos</h4>
                        <p className="text-sm text-white/40 leading-relaxed font-medium max-w-xl">
                            La facturación electrónica en <span className="text-blue-400 font-black uppercase">{tenant?.name}</span> cumple con los protocolos de la DIAN. Cada documento emitido es legalmente vinculante y afecta directamente el flujo de caja operativo.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

