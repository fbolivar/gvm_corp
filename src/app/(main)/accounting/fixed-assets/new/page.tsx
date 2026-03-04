import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import Link from 'next/link';
import NewFixedAssetClient from './client';

export default async function NewFixedAssetPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl">
                    <Link href="/accounting/fixed-assets"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Nuevo Activo Fijo</h1>
                    <p className="text-xs text-slate-400">Registro con depreciación automática línea recta</p>
                </div>
            </div>

            <NewFixedAssetClient />
        </div>
    );
}
