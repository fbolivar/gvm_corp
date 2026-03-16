import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DimensionManager } from '@/features/accounting/components/DimensionManager';
import { Layers } from 'lucide-react';
import type { Dimension, DimensionValue } from '@/features/accounting/services/dimensionService';

export default async function DimensionsSettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: dimensions } = await supabase
        .from('dimensions')
        .select('*')
        .order('code', { ascending: true });

    const { data: dimensionValues } = await supabase
        .from('dimension_values')
        .select('*, dimension:dimensions(code, name)')
        .order('code', { ascending: true });

    return (
        <div className="page-container space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Premium Header */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 p-10 text-white shadow-active">
                <div className="absolute top-0 right-0 p-8 opacity-[0.04] pointer-events-none">
                    <Layers className="h-48 w-48" />
                </div>
                <div className="relative z-10 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 w-8 bg-indigo-500 rounded-full" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">
                            Configuracion
                        </span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight uppercase leading-tight">
                        Dimensiones{' '}
                        <span className="text-slate-500">Analiticas</span>
                    </h1>
                    <p className="text-white/40 text-[9px] font-bold uppercase tracking-[0.3em]">
                        Centros de costo, departamentos y dimensiones contables
                    </p>
                </div>
            </div>

            <DimensionManager
                dimensions={(dimensions ?? []) as Dimension[]}
                dimensionValues={(dimensionValues ?? []) as DimensionValue[]}
            />
        </div>
    );
}
