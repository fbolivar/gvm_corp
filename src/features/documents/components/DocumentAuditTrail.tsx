import { SupabaseClient } from '@supabase/supabase-js';
import { CheckCircle2, Pencil, Trash2, Plus, History } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface AuditRow {
    id: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | string;
    entity: string;
    entity_id: string;
    actor_user_id: string | null;
    created_at: string;
}

interface ProfileRow {
    id: string;
    full_name: string | null;
}

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Plus; tint: string }> = {
    CREATE: { label: 'Creado', icon: Plus, tint: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60' },
    UPDATE: { label: 'Actualizado', icon: Pencil, tint: 'bg-sky-50 text-sky-700 ring-sky-200/60' },
    DELETE: { label: 'Eliminado', icon: Trash2, tint: 'bg-rose-50 text-rose-700 ring-rose-200/60' },
};

const entityLabel: Record<string, string> = {
    documents: 'Documento',
    document_lines: 'Línea',
    electronic_documents: 'Firma electrónica',
};

function fmtDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('es-CO', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export async function DocumentAuditTrail({
    client,
    documentId,
}: {
    client: SupabaseClient;
    documentId: string;
}) {
    // 1) Registros de audit del doc (directos) + de sus líneas
    const { data: linesRows } = await client
        .from('document_lines')
        .select('id')
        .eq('document_id', documentId);
    const lineIds = (linesRows || []).map(l => l.id as string);

    // Cargar logs del documento y de sus líneas
    const docLogPromise = client
        .from('audit_log')
        .select('id, action, entity, entity_id, actor_user_id, created_at')
        .eq('entity', 'documents')
        .eq('entity_id', documentId)
        .order('created_at', { ascending: false })
        .limit(50);

    const lineLogPromise = lineIds.length > 0
        ? client
            .from('audit_log')
            .select('id, action, entity, entity_id, actor_user_id, created_at')
            .eq('entity', 'document_lines')
            .in('entity_id', lineIds)
            .order('created_at', { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [] as AuditRow[] });

    const [docLogRes, lineLogRes] = await Promise.all([docLogPromise, lineLogPromise]);

    const entries: AuditRow[] = [
        ...((docLogRes.data || []) as AuditRow[]),
        ...((lineLogRes.data || []) as AuditRow[]),
    ].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 30);

    // Resolver nombres de usuarios
    const actorIds = [...new Set(entries.map(e => e.actor_user_id).filter(Boolean) as string[])];
    const { data: profiles } = actorIds.length > 0
        ? await client.from('profiles').select('id, full_name').in('id', actorIds)
        : { data: [] as ProfileRow[] };
    const nameMap = new Map<string, string>();
    (profiles || []).forEach((p: ProfileRow) => {
        if (p.full_name) nameMap.set(p.id, p.full_name);
    });

    if (entries.length === 0) {
        return (
            <div className="surface-card p-5">
                <div className="flex items-center gap-2 mb-3">
                    <History className="h-4 w-4 text-slate-400" />
                    <h3 className="text-h3">Historial de cambios</h3>
                </div>
                <p className="text-sm text-slate-500">Sin movimientos auditados.</p>
            </div>
        );
    }

    return (
        <div className="surface-card p-5">
            <div className="flex items-center gap-2 mb-4">
                <History className="h-4 w-4 text-slate-400" />
                <h3 className="text-h3">Historial de cambios</h3>
                <span className="text-caption ml-auto">{entries.length} eventos</span>
            </div>
            <ol className="relative border-l border-slate-200 ml-2 space-y-4">
                {entries.map(e => {
                    const cfg = ACTION_CONFIG[e.action] ?? { label: e.action, icon: CheckCircle2, tint: 'bg-slate-50 text-slate-600 ring-slate-200/60' };
                    const Icon = cfg.icon;
                    const actorName = e.actor_user_id ? (nameMap.get(e.actor_user_id) || 'Usuario') : 'Sistema';
                    const target = entityLabel[e.entity] || e.entity;
                    return (
                        <li key={e.id} className="ml-4">
                            <span className={cn(
                                "absolute -left-[10px] flex items-center justify-center w-5 h-5 rounded-full ring-2 ring-white",
                                cfg.tint
                            )}>
                                <Icon className="h-2.5 w-2.5" />
                            </span>
                            <div className="pb-1">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-slate-900">{cfg.label}</span>
                                    <span className="text-sm text-slate-500">· {target.toLowerCase()}</span>
                                </div>
                                <p className="text-caption mt-0.5">
                                    {actorName} · {fmtDate(e.created_at)}
                                </p>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
