import { createClient } from '@/lib/supabase/server';
import { partyService } from '@/features/parties/services/partyService';
import { productService } from '@/features/products/services/productService';
import { canViewModule } from '@/shared/lib/moduleGuard';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import ImportBillClient from './client';

export const metadata = { title: 'Importar factura con IA — GVM Corp' };

export default async function ImportBillPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    // Mismo guard de módulo que el resto de Compras: la captura crea una compra.
    if (!(await canViewModule('purchasing'))) redirect('/purchasing/bills');

    const [parties, products] = await Promise.all([
        partyService.getAllPartiesLight(supabase, 'vendor'),
        productService.getAllActiveProductsLight(supabase),
    ]);

    return (
        <div className="page-container space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div>
                <Button
                    variant="ghost"
                    asChild
                    className="h-10 px-4 rounded-2xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 font-black text-[10px] uppercase tracking-widest gap-2 transition-all"
                >
                    <Link href="/purchasing/bills">
                        <ArrowLeft className="h-3.5 w-3.5" /> Volver a Compras
                    </Link>
                </Button>
            </div>

            <div className="relative group overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active border border-white/5">
                <div className="absolute top-0 right-0 p-12 opacity-[0.04] pointer-events-none">
                    <Sparkles className="h-80 w-80" />
                </div>
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-400">Captura con Inteligencia Artificial</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
                        Importar factura de <span className="text-slate-500">proveedor</span>
                    </h1>
                    <p className="text-white/50 text-sm font-medium max-w-2xl">
                        Sube una foto o PDF de la factura. La IA extrae el proveedor, los ítems y los valores, y arma un
                        <span className="font-bold text-white/80"> borrador para que lo revises y apruebes</span>. Nada se guarda sin tu confirmación.
                    </p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto w-full">
                <ImportBillClient parties={parties || []} products={products || []} />
            </div>
        </div>
    );
}
