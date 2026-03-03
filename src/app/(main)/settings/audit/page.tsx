import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Shield } from 'lucide-react';
import AuditLogClient from './client';

export default async function AuditLogPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Fetch audit logs directly — order by most recent, limit to 500
    const { data: logs, error } = await supabase
        .from('audit_log')
        .select('id, actor_user_id, action, entity, entity_id, payload, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

    // Enrich logs with user display names from profiles
    const userIds = [...new Set((logs || []).map((l) => l.actor_user_id).filter(Boolean))];
    let userMap: Record<string, string> = {};

    if (userIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);
        profiles?.forEach((p) => {
            userMap[p.id] = p.full_name || p.email || 'Desconocido';
        });
    }

    const enrichedLogs = (logs || []).map((log) => ({
        ...log,
        actor_name: log.actor_user_id ? (userMap[log.actor_user_id] ?? 'Sistema') : 'Sistema',
    }));

    const totalCount = enrichedLogs.length;
    const uniqueUsers = new Set(enrichedLogs.map((l) => l.actor_user_id).filter(Boolean)).size;
    const mostRecent = enrichedLogs[0]?.created_at ?? null;

    return (
        <div className="page-container space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Premium Header */}
            <div className="relative group overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active border border-white/5">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                    <Shield className="h-64 w-64" />
                </div>
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 w-8 bg-indigo-500 rounded-full" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-400">
                            Seguridad &amp; Compliance
                        </span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight uppercase leading-tight">
                        Registro de{' '}
                        <span className="text-slate-500">Auditoría</span>
                    </h1>
                    <p className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.3em]">
                        Traza inmutable de todas las operaciones del sistema
                    </p>
                </div>
            </div>

            <AuditLogClient
                logs={enrichedLogs}
                totalCount={totalCount}
                uniqueUsers={uniqueUsers}
                mostRecent={mostRecent}
            />
        </div>
    );
}
