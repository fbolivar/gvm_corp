import { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AuditFilters {
    q?: string;
    entity?: string;
    action?: string;
    actor?: string; // uuid de actor_user_id (filtro exacto por usuario)
    from?: string; // yyyy-mm-dd (día local Bogotá)
    to?: string;   // yyyy-mm-dd (día local Bogotá)
}

export interface UserActivityRow {
    actor_user_id: string;
    total: number;
    inserts: number;
    updates: number;
    deletes: number;
    entities: number;
    first_at: string;
    last_at: string;
}

export interface UserActivity extends UserActivityRow {
    actor_name: string;
    actor_email: string | null;
    actor_role: string | null;
}

export interface AuditLogRow {
    id: string;
    actor_user_id: string | null;
    action: string;
    entity: string;
    entity_id: string | null;
    payload: unknown;
    created_at: string;
}

export interface EnrichedAuditLog extends AuditLogRow {
    actor_name: string;
}

const SELECT_COLS = 'id, actor_user_id, action, entity, entity_id, payload, created_at';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Limpia un término para usarlo dentro de un `.or()` de PostgREST, donde las
 * comas y paréntesis son sintaxis reservada. Evita inyección de operadores.
 */
function sanitizeOrTerm(term: string): string {
    return term.replace(/[,()*%]/g, ' ').trim();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Construye la cláusula `.or()` de búsqueda para audit_log.
 *
 * IMPORTANTE: `actor_user_id` es de tipo uuid → NO admite ILIKE (rompería la
 * consulta). Para buscar por usuario, resolvemos el nombre/email contra
 * `profiles` y filtramos por `actor_user_id.in.(...)`. Sobre columnas de texto
 * (action, entity, entity_id) sí usamos ilike.
 *
 * Devuelve null si el término queda vacío tras sanear.
 */
async function buildSearchOr(client: SupabaseClient, rawTerm: string): Promise<string | null> {
    const term = sanitizeOrTerm(rawTerm);
    if (!term) return null;

    const parts = [
        `action.ilike.%${term}%`,
        `entity.ilike.%${term}%`,
        `entity_id.ilike.%${term}%`,
    ];

    // Buscar usuarios cuyo nombre o email coincida → filtrar por sus IDs.
    const { data: users } = await client
        .from('profiles')
        .select('id')
        .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(50);

    const ids = (users ?? []).map((u: { id: string }) => u.id);
    if (ids.length > 0) {
        parts.push(`actor_user_id.in.(${ids.join(',')})`);
    }

    // Si el término ES un uuid, permitir match exacto por actor.
    if (UUID_RE.test(term)) {
        parts.push(`actor_user_id.eq.${term}`);
    }

    return parts.join(',');
}

// ─── Service ────────────────────────────────────────────────────────────────

export const auditService = {
    /**
     * Trae los eventos de auditoría aplicando los filtros en el SERVIDOR
     * (contra la tabla completa, no solo un subconjunto reciente).
     */
    async getLogs(
        client: SupabaseClient,
        filters: AuditFilters,
        limit = 500
    ): Promise<AuditLogRow[]> {
        let query = client
            .from('audit_log')
            .select(SELECT_COLS)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (filters.entity) query = query.eq('entity', filters.entity);
        if (filters.action) query = query.eq('action', filters.action.toUpperCase());
        if (filters.actor) query = query.eq('actor_user_id', filters.actor);
        if (filters.from) query = query.gte('created_at', `${filters.from}T00:00:00-05:00`);
        if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59.999-05:00`);
        if (filters.q) {
            const orClause = await buildSearchOr(client, filters.q);
            if (orClause) query = query.or(orClause);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as AuditLogRow[];
    },

    /**
     * Cuenta los eventos que coinciden con los filtros (sin traer las filas).
     */
    async countLogs(client: SupabaseClient, filters: AuditFilters): Promise<number> {
        let query = client
            .from('audit_log')
            .select('id', { count: 'exact', head: true });

        if (filters.entity) query = query.eq('entity', filters.entity);
        if (filters.action) query = query.eq('action', filters.action.toUpperCase());
        if (filters.actor) query = query.eq('actor_user_id', filters.actor);
        if (filters.from) query = query.gte('created_at', `${filters.from}T00:00:00-05:00`);
        if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59.999-05:00`);
        if (filters.q) {
            const orClause = await buildSearchOr(client, filters.q);
            if (orClause) query = query.or(orClause);
        }

        const { count, error } = await query;
        if (error) throw error;
        return count ?? 0;
    },

    /**
     * Resuelve nombres legibles de los actores (profiles) para un set de filas.
     */
    async getActorNames(
        client: SupabaseClient,
        rows: AuditLogRow[]
    ): Promise<Record<string, string>> {
        const ids = [...new Set(rows.map((r) => r.actor_user_id).filter(Boolean))] as string[];
        const map: Record<string, string> = {};
        if (ids.length === 0) return map;

        const { data } = await client
            .from('profiles')
            .select('id, full_name, email')
            .in('id', ids);

        data?.forEach((p: { id: string; full_name: string | null; email: string | null }) => {
            map[p.id] = p.full_name || p.email || 'Desconocido';
        });
        return map;
    },

    /**
     * Combina filas con el mapa de nombres para producir eventos enriquecidos.
     */
    enrich(rows: AuditLogRow[], userMap: Record<string, string>): EnrichedAuditLog[] {
        return rows.map((log) => ({
            ...log,
            actor_name: log.actor_user_id ? (userMap[log.actor_user_id] ?? 'Sistema') : 'Sistema',
        }));
    },

    /**
     * Reporte de actividad por usuario (agregado en la BD vía RPC), enriquecido
     * con nombre, email y rol. `from`/`to` en formato yyyy-mm-dd (día Bogotá).
     */
    async getUserActivity(
        client: SupabaseClient,
        from?: string,
        to?: string
    ): Promise<UserActivity[]> {
        const { data, error } = await client.rpc('get_audit_user_activity', {
            p_from: from ? `${from}T00:00:00-05:00` : null,
            p_to: to ? `${to}T23:59:59.999-05:00` : null,
        });
        if (error) throw error;

        const rows = (data ?? []) as UserActivityRow[];
        const ids = rows.map((r) => r.actor_user_id);
        if (ids.length === 0) return [];

        const [{ data: profiles }, { data: memberships }] = await Promise.all([
            client.from('profiles').select('id, full_name, email').in('id', ids),
            client.from('user_tenants').select('user_id, role').in('user_id', ids),
        ]);

        const nameMap: Record<string, { name: string; email: string | null }> = {};
        profiles?.forEach((p: { id: string; full_name: string | null; email: string | null }) => {
            nameMap[p.id] = { name: p.full_name || p.email || 'Desconocido', email: p.email };
        });
        const roleMap: Record<string, string> = {};
        memberships?.forEach((m: { user_id: string; role: string | null }) => {
            if (m.role) roleMap[m.user_id] = m.role;
        });

        return rows.map((r) => ({
            ...r,
            actor_name: nameMap[r.actor_user_id]?.name ?? 'Desconocido',
            actor_email: nameMap[r.actor_user_id]?.email ?? null,
            actor_role: roleMap[r.actor_user_id] ?? null,
        }));
    },
};
