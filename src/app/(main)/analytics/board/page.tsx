import { createClient } from '@/lib/supabase/server';
import { canViewModule } from '@/shared/lib/moduleGuard';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Gavel } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import BoardReportClient from './client';

export const metadata = { title: 'Junta Directiva IA — GVM Corp' };
// El análisis cruzado puede tardar: amplía el tiempo del server action.
export const maxDuration = 60;

export default async function BoardReportPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    // Informe ejecutivo transversal: para quien ve la Analítica (gerencia/BI).
    if (!(await canViewModule('analytics'))) redirect('/dashboard');

    return (
        <div className="page-container space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div>
                <Button
                    variant="ghost"
                    asChild
                    className="h-10 px-4 rounded-2xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 font-black text-[10px] uppercase tracking-widest gap-2 transition-all"
                >
                    <Link href="/dashboard">
                        <ArrowLeft className="h-3.5 w-3.5" /> Volver al Dashboard
                    </Link>
                </Button>
            </div>

            <div className="relative group overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active border border-white/5">
                <div className="absolute top-0 right-0 p-12 opacity-[0.04] pointer-events-none">
                    <Gavel className="h-80 w-80" />
                </div>
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <Gavel className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">Análisis cruzado con IA</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
                        Junta <span className="text-slate-500">Directiva IA</span>
                    </h1>
                    <p className="text-white/50 text-sm font-medium max-w-2xl">
                        Convoca un análisis que cruza ventas, cartera, inventario, tesorería y compras, y te entrega
                        <span className="font-bold text-white/80"> recomendaciones priorizadas para que apruebes</span>.
                        Nada se ejecuta automáticamente.
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto w-full">
                <BoardReportClient />
            </div>
        </div>
    );
}
