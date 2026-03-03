import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/features/documents/services/documentService';
import { VendorBillList } from '@/features/purchasing/components/VendorBillList';
import { Button } from "@/shared/components/ui/button"
import { Plus, FileCheck, Banknote, Activity, ShieldCheck, ArrowRight } from "lucide-react"
import Link from "next/link"
import { redirect } from 'next/navigation';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { settingsService } from '@/features/settings/services/settingsService';

export default async function VendorBillsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [billsResult, tenant] = await Promise.all([
        documentService.getDocuments(supabase, {
            page: 1,
            per_page: 50,
            type: 'VENDOR_BILL' as any
        }),
        settingsService.getTenantInfo(supabase)
    ]);

    const bills = billsResult.data || [];
    const totalAP = bills.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const pendingAuditors = bills.filter(b => b.status === 'DRAFT').length;

    return (
        <div className="page-container space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* 💎 PREMIUM HEADER */}
            <VisualReportHeader
                title="Cuentas por Pagar"
                subtitle="Registro y Auditoría de Obligaciones"
                tenant={tenant}
            />

            {/* 📊 SUMMARY V3 STRIP */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 px-1">
                <div className="flex flex-wrap items-center gap-12">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">Pasivo Circulante</span>
                        <div className="flex items-baseline gap-4">
                            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalAP)}
                            </h2>
                            <span className="text-xl font-black text-slate-300 uppercase italic tracking-widest leading-none">Saldo</span>
                        </div>
                    </div>

                    <div className="h-16 w-px bg-slate-100 hidden md:block" />

                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] leading-none mb-4">Pend. Auditoría</span>
                        <div className="flex items-center gap-3">
                            <span className="text-4xl font-black text-rose-600 tracking-tighter italic leading-none">{pendingAuditors}</span>
                            <div className="h-10 w-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shadow-inner">
                                <FileCheck className="h-5 w-5" />
                            </div>
                        </div>
                    </div>

                    <div className="h-16 w-px bg-slate-100 hidden md:block" />

                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] leading-none mb-4">Flujo Fiscal</span>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shadow-inner">
                                <Activity className="h-4 w-4" />
                            </div>
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">Conciliado v3</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button asChild className="h-14 px-10 rounded-2xl bg-slate-900 hover:bg-emerald-600 text-white font-black shadow-active transition-all hover:scale-105 active:scale-95 border-none group/btn">
                        <Link href="/purchasing/bills/new" className="flex items-center gap-3">
                            <Plus className="h-6 w-6 text-emerald-400" />
                            <span className="text-[10px] uppercase tracking-[0.2em]">Cargar Factura</span>
                        </Link>
                    </Button>
                </div>
            </div>

            {/* 📋 LISTADO DE FACTURAS */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-1">
                    <div className="h-8 w-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-active">
                        <Banknote className="h-4 w-4" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Maestro de Obligaciones</h3>
                </div>
                <div className="bg-white rounded-[3.5rem] shadow-premium p-4 md:p-8 overflow-hidden">
                    <VendorBillList bills={bills} />
                </div>
            </div>

            {/* 🛡️ AUDIT FOOTER */}
            <div className="bg-slate-950 p-10 rounded-[2.5rem] text-white flex flex-col lg:flex-row items-center justify-between gap-12 shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                    <ShieldCheck className="h-20 w-20 text-white" />
                </div>
                <div className="flex items-center gap-10 relative z-10 text-center lg:text-left flex-col lg:flex-row">
                    <div className="h-20 w-20 bg-white/10 rounded-[2rem] flex items-center justify-center text-white border border-white/10 shadow-inner rotate-12 group-hover:rotate-0 transition-transform duration-700">
                        <Activity className="h-10 w-10 text-indigo-400" />
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-2xl font-black tracking-tight uppercase leading-tight text-white">Consolidación Pasiva</h4>
                        <p className="text-sm text-white/40 leading-relaxed font-medium max-w-xl">
                            Estas obligaciones impactan directamente el balance de <span className="text-indigo-400 font-black uppercase">{tenant?.name}</span>.
                            Asegúrese de validar que el soporte XML/PDF coincida con los valores registrados.
                        </p>
                    </div>
                </div>
                <Button variant="outline" className="h-14 bg-white/5 border-white/10 text-white text-[10px] font-black uppercase tracking-widest px-10 hover:bg-white hover:text-slate-900 transition-all rounded-2xl relative z-10 shadow-active">
                    Protocolo de Auditoría <ArrowRight className="ml-4 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
