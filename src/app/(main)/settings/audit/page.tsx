import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Shield, Users } from 'lucide-react';
import AuditLogClient from './client';
import {
    auditService,
    AuditFilters,
    EnrichedAuditLog,
} from '@/features/settings/services/auditService';

// Cuántos eventos se cargan en pantalla por render. El filtrado ocurre en el
// servidor (tabla completa); esto solo limita cuántas filas se pintan a la vez.
// El reporte CSV NO tiene este límite (usa su propio tope mayor).
const PAGE_LIMIT = 1000;

export default async function AuditLogPage({
    searchParams,
}: {
    searchParams: Promise<{
        q?: string;
        entity?: string;
        action?: string;
        actor?: string;
        from?: string;
        to?: string;
    }>;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const sp = await searchParams;
    const filters: AuditFilters = {
        q: sp.q || undefined,
        entity: sp.entity || undefined,
        action: sp.action || undefined,
        actor: sp.actor || undefined,
        from: sp.from || undefined,
        to: sp.to || undefined,
    };

    // Si se filtra por un usuario específico (drill-down desde el reporte), resolver su nombre.
    let actorName: string | null = null;
    if (filters.actor) {
        const { data: prof } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', filters.actor)
            .maybeSingle();
        actorName = prof?.full_name || prof?.email || null;
    }

    let logs: EnrichedAuditLog[] = [];
    let loadError: string | null = null;
    let filteredCount = 0;
    let totalCount = 0;

    try {
        const [rows, fCount, tCount] = await Promise.all([
            auditService.getLogs(supabase, filters, PAGE_LIMIT),
            auditService.countLogs(supabase, filters),
            auditService.countLogs(supabase, {}),
        ]);
        const userMap = await auditService.getActorNames(supabase, rows);
        logs = auditService.enrich(rows, userMap);
        filteredCount = fCount;
        totalCount = tCount;
    } catch (err) {
        loadError =
            err instanceof Error ? err.message : 'Error al cargar el registro de auditoría';
        console.error('[AuditLogPage] carga falló:', err);
    }

    const uniqueUsers = new Set(logs.map((l) => l.actor_user_id).filter(Boolean)).size;
    const mostRecent = logs[0]?.created_at ?? null;

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
                        Registro de <span className="text-slate-500">Auditoría</span>
                    </h1>
                    <p className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.3em]">
                        Traza inmutable de todas las operaciones del sistema
                    </p>
                    <Link
                        href="/settings/audit/users"
                        className="inline-flex items-center gap-2 mt-2 h-10 px-5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                    >
                        <Users className="h-4 w-4" /> Actividad por Usuario
                    </Link>
                </div>
            </div>

            <AuditLogClient
                logs={logs}
                totalCount={totalCount}
                filteredCount={filteredCount}
                loadedCount={logs.length}
                pageLimit={PAGE_LIMIT}
                uniqueUsers={uniqueUsers}
                mostRecent={mostRecent}
                loadError={loadError}
                initialFilters={filters}
                actorName={actorName}
            />
        </div>
    );
}
