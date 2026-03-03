import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cashFlowService } from '@/features/treasury/services/cashFlowService';
import { TrendingUp } from 'lucide-react';
import CashFlowClient from './client';

export default async function CashFlowPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const projection = await cashFlowService.getProjection(supabase, 90);

    return (
        <div className="page-container space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-700">

            {/* Premium Header */}
            <div className="relative group overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active border border-white/5">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                    <TrendingUp className="h-64 w-64" />
                </div>
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 w-8 bg-emerald-500 rounded-full" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-400">
                            Tesorería Inteligente
                        </span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight uppercase leading-tight">
                        Flujo de Caja <span className="text-slate-500">Proyectado</span>
                    </h1>
                    <p className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.3em]">
                        Proyección a 90 días basada en cuentas por cobrar, pagar y órdenes de compra
                    </p>
                </div>
            </div>

            <CashFlowClient projection={projection} />
        </div>
    );
}
