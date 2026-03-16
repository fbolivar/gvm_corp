import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ApiKeyManager } from '@/features/settings/components/ApiKeyManager';
import { Key } from 'lucide-react';

export default async function ApiKeysSettingsPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: apiKeys } = await supabase
        .from('api_keys')
        .select('id, name, prefix, scopes, is_active, created_at, last_used_at')
        .order('created_at', { ascending: false });

    return (
        <div className="page-container space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-amber-900 to-amber-800 p-10 text-white shadow-active">
                <div className="absolute top-0 right-0 p-8 opacity-[0.04] pointer-events-none">
                    <Key className="h-48 w-48" />
                </div>
                <div className="relative z-10 space-y-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">
                        Configuracion
                    </span>
                    <h1 className="text-3xl font-black tracking-tight uppercase">API Keys</h1>
                    <p className="text-white/40 text-xs font-bold">
                        Acceso OData para Power BI y reportes externos
                    </p>
                </div>
            </div>
            <ApiKeyManager apiKeys={(apiKeys ?? []) as ApiKeyRow[]} />
        </div>
    );
}

interface ApiKeyRow {
    id: string;
    name: string;
    prefix: string;
    scopes: string[];
    is_active: boolean;
    created_at: string;
    last_used_at: string | null;
}
