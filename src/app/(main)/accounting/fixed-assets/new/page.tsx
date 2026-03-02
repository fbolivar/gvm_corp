import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Package, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import NewFixedAssetClient from './client';

export default async function NewFixedAssetPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Package className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black tracking-tighter text-slate-900 italic">Nuevo Activo</h1>
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">Registro de activo fijo con depreciación automática</p>
                    </div>
                </div>
                <Button variant="outline" className="h-12 border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest" asChild>
                    <Link href="/accounting/fixed-assets"><ArrowLeft className="h-4 w-4 mr-2" />Volver</Link>
                </Button>
            </div>

            <NewFixedAssetClient />
        </div>
    );
}
