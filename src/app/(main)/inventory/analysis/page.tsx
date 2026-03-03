import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { abcAnalysisService } from '@/features/inventory/services/abcAnalysisService';
import { ABCAnalysisClient } from './client';
import { BarChart3 } from 'lucide-react';

export const metadata = { title: 'Análisis ABC — GVM Corp' };

export default async function ABCAnalysisPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { products, summary } = await abcAnalysisService
        .getAnalysis(supabase, 90)
        .catch(() => ({
            products: [],
            summary: {
                totalProducts: 0,
                classA: { count: 0, pctValue: 0, pctItems: 0 },
                classB: { count: 0, pctValue: 0, pctItems: 0 },
                classC: { count: 0, pctValue: 0, pctItems: 0 },
                totalStockValue: 0,
                avgRotation: 0,
                slowMovers: 0,
            },
        }));

    return (
        <div className="page-container space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Dark Premium Header */}
            <div className="relative overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                    <BarChart3 className="h-32 w-32 text-white" />
                </div>
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-8 bg-emerald-500 rounded-full" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-400">
                            Inventario · Inteligencia
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
                        Análisis<br />
                        <span className="text-slate-500">ABC / Rotación</span>
                    </h1>
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">
                        Clasificación Pareto · Rotación · Días de Stock
                    </p>
                </div>

                {/* Class badges in header */}
                <div className="relative z-10 mt-8 flex flex-wrap gap-4">
                    {[
                        { label: 'Clase A', desc: '80% del valor', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
                        { label: 'Clase B', desc: '15% del valor', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
                        { label: 'Clase C', desc: '5% del valor',  color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
                    ].map(c => (
                        <div key={c.label} className={`px-4 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-widest ${c.color}`}>
                            {c.label} — {c.desc}
                        </div>
                    ))}
                </div>
            </div>

            <ABCAnalysisClient initialProducts={products} initialSummary={summary} />
        </div>
    );
}
