import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users, ArrowLeft } from 'lucide-react';
import UserActivityClient from './client';
import { auditService, UserActivity } from '@/features/settings/services/auditService';

export const metadata = { title: 'Actividad por Usuario — GVM Corp' };

export default async function UserActivityPage({
    searchParams,
}: {
    searchParams: Promise<{ from?: string; to?: string }>;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const sp = await searchParams;
    const from = sp.from || undefined;
    const to = sp.to || undefined;

    let activity: UserActivity[] = [];
    let loadError: string | null = null;
    try {
        activity = await auditService.getUserActivity(supabase, from, to);
    } catch (err) {
        loadError =
            err instanceof Error ? err.message : 'Error al cargar la actividad por usuario';
        console.error('[UserActivityPage] carga falló:', err);
    }

    return (
        <div className="page-container space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Header */}
            <div className="relative group overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active border border-white/5">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                    <Users className="h-64 w-64" />
                </div>
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 w-8 bg-indigo-500 rounded-full" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">
                            Seguridad &amp; Compliance
                        </span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight uppercase leading-tight">
                        Actividad por <span className="text-slate-500">Usuario</span>
                    </h1>
                    <p className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.3em]">
                        Resumen de operaciones de cada usuario en el sistema
                    </p>
                    <Link
                        href="/settings/audit"
                        className="inline-flex items-center gap-2 mt-2 h-10 px-5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" /> Volver al registro
                    </Link>
                </div>
            </div>

            <UserActivityClient activity={activity} loadError={loadError} from={from} to={to} />
        </div>
    );
}
