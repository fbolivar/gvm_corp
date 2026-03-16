import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CurrencyManager } from '@/features/accounting/components/CurrencyManager';
import { Coins } from 'lucide-react';

export const metadata = {
    title: 'Monedas y Tasas de Cambio | Configuracion',
};

export default async function CurrenciesSettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: currencies } = await supabase
        .from('currencies')
        .select('*')
        .order('code');

    const { data: rates } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('effective_date', { ascending: false })
        .limit(100);

    return (
        <div className="page-container space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-900 to-emerald-800 p-10 text-white shadow-active">
                <div className="absolute top-0 right-0 p-8 opacity-[0.04] pointer-events-none">
                    <Coins className="h-48 w-48" />
                </div>
                <div className="relative z-10 space-y-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Configuracion</span>
                    <h1 className="text-3xl font-black tracking-tight uppercase">Monedas y Tasas de Cambio</h1>
                    <p className="text-white/40 text-xs font-bold">Gestion multi-divisa con tasas de cambio historicas</p>
                </div>
            </div>
            <CurrencyManager
                currencies={(currencies ?? []) as Array<{ code: string; name: string; symbol: string; decimal_places: number }>}
                rates={(rates ?? []) as Array<{ id: string; from_currency: string; to_currency: string; rate: number; effective_date: string }>}
            />
        </div>
    );
}
