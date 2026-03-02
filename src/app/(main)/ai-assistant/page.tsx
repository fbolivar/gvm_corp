import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AIAssistantChat } from '@/features/ai/components/AIAssistantChat';
import { Sparkles, Brain, TrendingUp, Users, Package, Target, Banknote, FileText } from 'lucide-react';

const CAPABILITIES = [
    { icon: TrendingUp,  color: 'text-emerald-500', bg: 'bg-emerald-50', title: 'Finanzas',      desc: 'Ventas, gastos, utilidades y márgenes en tiempo real' },
    { icon: Target,      color: 'text-indigo-500',  bg: 'bg-indigo-50',  title: 'Presupuesto',   desc: 'Comparativa plan vs ejecutado por categoría' },
    { icon: FileText,    color: 'text-blue-500',    bg: 'bg-blue-50',    title: 'Cartera',        desc: 'Facturas pendientes, vencidas y cobranza' },
    { icon: Users,       color: 'text-violet-500',  bg: 'bg-violet-50',  title: 'Nómina',         desc: 'Empleados activos, masa salarial y costos patronales' },
    { icon: Package,     color: 'text-amber-500',   bg: 'bg-amber-50',   title: 'Inventario',     desc: 'Stock crítico, productos agotados y valorización' },
    { icon: Banknote,    color: 'text-teal-500',    bg: 'bg-teal-50',    title: 'Tesorería',      desc: 'Flujo de caja, entradas y salidas de efectivo' },
];

export default async function AIAssistantPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    return (
        <div className="space-y-10 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* Header */}
            <div className="bg-slate-900 rounded-[3.5rem] p-12 md:p-16 text-white shadow-active relative overflow-hidden">
                <div className="absolute top-0 right-0 p-16 opacity-[0.04] pointer-events-none">
                    <Brain className="h-80 w-80" />
                </div>
                <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-12 bg-indigo-500 rounded-full" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">Inteligencia Artificial</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter italic uppercase leading-[0.85]">
                        GVM <br /><span className="text-slate-500">AI</span>
                    </h1>
                    <p className="text-slate-400 text-sm font-medium max-w-lg leading-relaxed">
                        Tu asistente financiero personal. Consulta datos en tiempo real, analiza tendencias y toma mejores decisiones — en lenguaje natural.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
                            <div className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300">Datos en Tiempo Real</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
                            <Sparkles className="h-3 w-3 text-indigo-300" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300">Powered by Claude</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Capabilities */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {CAPABILITIES.map(cap => (
                    <div key={cap.title} className="bg-white rounded-[2rem] p-5 shadow-premium text-center space-y-3">
                        <div className={`h-11 w-11 rounded-xl ${cap.bg} flex items-center justify-center mx-auto`}>
                            <cap.icon className={`h-5 w-5 ${cap.color}`} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-wide">{cap.title}</p>
                            <p className="text-[9px] text-slate-400 font-medium leading-tight mt-1">{cap.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Chat */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-[3rem] shadow-premium overflow-hidden" style={{ minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
                        <AIAssistantChat mode="inline" />
                    </div>
                </div>

                {/* Tips */}
                <div className="lg:col-span-4 space-y-5">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-premium">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-5">Ejemplos de preguntas</p>
                        <div className="space-y-3">
                            {[
                                '¿Cuánto vendí este mes comparado con el anterior?',
                                '¿Cuál es mi margen de utilidad del año?',
                                '¿Qué facturas están vencidas y por cuánto?',
                                '¿Cómo va el presupuesto de gastos?',
                                '¿Cuántos empleados tengo activos?',
                                '¿Cuál es mi flujo de caja de los últimos 30 días?',
                                '¿Hay productos con stock crítico?',
                            ].map(tip => (
                                <div key={tip} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                                    <Sparkles className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-slate-600 font-medium leading-snug">{tip}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white">
                        <div className="h-12 w-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4">
                            <Brain className="h-6 w-6 text-indigo-300" />
                        </div>
                        <h4 className="text-base font-black italic uppercase mb-2">Análisis Inteligente</h4>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                            GVM AI consulta tus datos reales de Supabase en tiempo real usando herramientas especializadas.
                            No inventa cifras — todo proviene de tu propia base de datos.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
