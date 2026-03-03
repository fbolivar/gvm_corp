import { createClient } from '@/lib/supabase/server';
import { partyService } from '@/features/parties/services/partyService';
import { redirect } from 'next/navigation';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import NewRecurringInvoiceClient from './client';

export default async function NewRecurringInvoicePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: parties } = await partyService.getParties(supabase, { page: 1, per_page: 500, role: 'customer' });

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex items-center justify-between px-1">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <RefreshCw className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900">Nueva Recurrencia</h1>
                            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">Configurar plantilla de facturación automática</p>
                        </div>
                    </div>
                </div>
                <Button variant="outline" className="h-12 border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest" asChild>
                    <Link href="/sales/recurring"><ArrowLeft className="h-4 w-4 mr-2" />Volver</Link>
                </Button>
            </div>

            <NewRecurringInvoiceClient parties={parties ?? []} />
        </div>
    );
}
