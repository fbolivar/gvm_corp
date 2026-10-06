import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAllRows } from '@/shared/lib/fetchAllRows';
import { buildSnapshot, type SaleRow, type SaleLineRow } from '../utils/accountHealth';
import type { CrmVisit, PartyCommercialSnapshot, VisitOutcomeInput, VisitPlanInput, VisitStatus } from '../types/visits';

/**
 * Planeador de visitas comerciales.
 *
 * Toda lectura/escritura pasa por el cliente de sesión (RLS por tenant). La
 * regla "un comercial solo ve sus visitas, un gerente ve todas" es de la
 * aplicación y se resuelve en `canSeeAllVisits`; las Server Actions la aplican
 * antes de consultar.
 */

const SELECT = `
    *,
    salesperson:profiles!crm_visits_salesperson_id_fkey(full_name, email),
    party:parties!crm_visits_party_id_fkey(legal_name, city, phone, email, contact_name)
`;

/** Roles que ven el planeador de todo el equipo comercial. */
const MANAGER_ROLES = new Set([
    'SUPER ADMINISTRADOR', 'ADMINISTRADOR', 'GENERAL MANAGER', 'GERENTE ADMINISTRATIVO',
    'SALES AND MARKETING MANAGER', 'ASISTENTE DE GERENCIA VENTAS', 'ASISTENTE COMERCIAL',
    'JEFE ADMINISTRATIVO',
]);

interface Embedded { full_name?: string | null; email?: string | null }
interface PartyEmbed { legal_name?: string | null; city?: string | null; phone?: string | null; email?: string | null; contact_name?: string | null }
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

function mapVisit(row: Record<string, unknown>): CrmVisit {
    const sp = one(row.salesperson as Embedded | Embedded[] | null);
    const party = one(row.party as PartyEmbed | PartyEmbed[] | null);
    const { salesperson: _s, party: _p, ...rest } = row;
    void _s; void _p;
    return {
        ...(rest as Omit<CrmVisit, 'salesperson_name' | 'party_name' | 'party_city' | 'party_phone' | 'party_email' | 'party_contact'>),
        salesperson_name: sp?.full_name || sp?.email || 'Sin nombre',
        party_name: party?.legal_name ?? null,
        party_city: party?.city ?? null,
        party_phone: party?.phone ?? null,
        party_email: party?.email ?? null,
        party_contact: party?.contact_name ?? null,
    };
}

export interface VisitFilters {
    salespersonId?: string;
    status?: VisitStatus | '';
    from?: string;
    to?: string;
    partyId?: string;
}

export interface Salesperson { id: string; name: string; role: string | null }

export const visitService = {
    async canSeeAllVisits(client: SupabaseClient, userId: string): Promise<boolean> {
        const { data: ut } = await client
            .from('user_tenants').select('role, role_id').eq('user_id', userId).maybeSingle();
        if (!ut) return false;
        if (['admin', 'owner'].includes(String(ut.role ?? ''))) return true;
        if (!ut.role_id) return false;
        const [{ data: roleRow }, { data: perm }] = await Promise.all([
            client.from('app_roles').select('name').eq('id', ut.role_id).maybeSingle(),
            client.from('role_permissions').select('can_admin').eq('role_id', ut.role_id).eq('module_key', 'crm').maybeSingle(),
        ]);
        if (roleRow?.name && MANAGER_ROLES.has(String(roleRow.name).toUpperCase())) return true;
        return !!perm?.can_admin;
    },

    /**
     * Equipo comercial del tenant (roles comerciales, de ventas y técnicos) más
     * el propio usuario, SOLO para quien ve todo el equipo. El guard vive aquí
     * para que ningún llamador pueda olvidarlo y enviar el directorio a un
     * comercial raso. No se lista toda la nómina: el gerente busca al comercial.
     */
    async getSalespeople(client: SupabaseClient, userId: string): Promise<Salesperson[]> {
        if (!(await this.canSeeAllVisits(client, userId))) return [];
        const { data: uts } = await client.from('user_tenants').select('user_id, role_id');
        const roleIds = [...new Set((uts ?? []).map(u => u.role_id as string | null).filter(Boolean))] as string[];
        const { data: roles } = roleIds.length
            ? await client.from('app_roles').select('id, name').in('id', roleIds)
            : { data: [] as { id: string; name: string }[] };
        const roleName = new Map((roles ?? []).map(r => [r.id as string, r.name as string]));
        const isCommercial = (r: string | null) => !!r && /COMERCIAL|SALES|VENTAS|TECNIC|MANAGER/i.test(r);

        const members = (uts ?? [])
            .map(u => ({ id: u.user_id as string, role: roleName.get(u.role_id as string) ?? null }))
            .filter(m => m.id === userId || isCommercial(m.role));
        if (members.length === 0) return [];

        const { data: profiles } = await client
            .from('profiles').select('id, full_name, email').in('id', members.map(m => m.id));
        const roleOf = new Map(members.map(m => [m.id, m.role]));
        return (profiles ?? [])
            .map(p => ({ id: p.id as string, name: (p.full_name as string) || (p.email as string) || 'Usuario', role: roleOf.get(p.id as string) ?? null }))
            .sort((a, b) => a.name.localeCompare(b.name));
    },

    async list(client: SupabaseClient, f: VisitFilters = {}): Promise<CrmVisit[]> {
        let q = client.from('crm_visits').select(SELECT);
        if (f.salespersonId) q = q.eq('salesperson_id', f.salespersonId);
        if (f.status) q = q.eq('status', f.status);
        if (f.from) q = q.gte('planned_date', f.from);
        if (f.to) q = q.lte('planned_date', f.to);
        if (f.partyId) q = q.eq('party_id', f.partyId);
        const rows = await fetchAllRows<Record<string, unknown>>(
            ({ from, to }) => q.order('planned_date', { ascending: false }).order('id').range(from, to),
            { label: 'crm_visits' },
        );
        return rows.map(mapVisit);
    },

    async getById(client: SupabaseClient, id: string): Promise<CrmVisit | null> {
        const { data, error } = await client.from('crm_visits').select(SELECT).eq('id', id).maybeSingle();
        if (error) throw new Error(error.message);
        return data ? mapVisit(data as Record<string, unknown>) : null;
    },

    async create(client: SupabaseClient, tenantId: string, userId: string, input: VisitPlanInput): Promise<string> {
        const { data, error } = await client
            .from('crm_visits')
            .insert({
                tenant_id: tenantId,
                salesperson_id: input.salesperson_id,
                is_internal: !!input.is_internal,
                party_id: input.is_internal ? null : input.party_id,
                title: input.is_internal ? input.title : null,
                priority: input.priority ?? 2,
                management_type: input.management_type,
                objective: input.objective,
                meeting_type: input.meeting_type,
                planned_date: input.planned_date,
                status: input.status ?? 'PENDIENTE',
                created_by: userId,
            })
            .select('id')
            .single();
        if (error) throw new Error(error.message);
        return data.id as string;
    },

    async updatePlan(client: SupabaseClient, id: string, input: VisitPlanInput): Promise<void> {
        const { error } = await client
            .from('crm_visits')
            .update({
                salesperson_id: input.salesperson_id,
                is_internal: !!input.is_internal,
                party_id: input.is_internal ? null : input.party_id,
                title: input.is_internal ? input.title : null,
                priority: input.priority ?? 2,
                management_type: input.management_type,
                objective: input.objective,
                meeting_type: input.meeting_type,
                planned_date: input.planned_date,
                status: input.status ?? 'PENDIENTE',
            })
            .eq('id', id);
        if (error) throw new Error(error.message);
    },

    async recordOutcome(client: SupabaseClient, id: string, input: VisitOutcomeInput): Promise<void> {
        const patch: Record<string, unknown> = {
            status: input.status,
            done_date: input.status === 'REALIZADA' ? input.done_date : null,
            conclusions: input.conclusions || null,
            commitments: input.commitments || null,
            next_followup_date: input.next_followup_date || null,
            result: input.status === 'REALIZADA' ? input.result : null,
        };
        // Reprogramar mueve la fecha planeada; el estado queda como REPROGRAMADA
        // para que el tablero cuente cuántas se corrieron.
        if (input.status === 'REPROGRAMADA' && input.planned_date) patch.planned_date = input.planned_date;
        const { error } = await client.from('crm_visits').update(patch).eq('id', id);
        if (error) throw new Error(error.message);
    },

    async remove(client: SupabaseClient, id: string): Promise<void> {
        const { error } = await client.from('crm_visits').delete().eq('id', id);
        if (error) throw new Error(error.message);
    },

    /**
     * Ficha comercial en vivo del cliente. Las facturas reales siguen en
     * WorldOffice: en la app la venta consolidada son los pedidos ACCEPTED
     * (facturados), igual que en la simulación contable.
     */
    async getPartySnapshot(client: SupabaseClient, partyId: string, today: string): Promise<PartyCommercialSnapshot> {
        const docs = await fetchAllRows<{ id: string; issue_date: string; total: number | null }>(
            ({ from, to }) => client
                .from('documents')
                .select('id, issue_date, total')
                .eq('party_id', partyId)
                .eq('doc_type', 'SALES_ORDER')
                .eq('status', 'ACCEPTED')
                .order('id')
                .range(from, to),
            { label: 'crm_visits.snapshot.docs' },
        );
        const sales: SaleRow[] = docs.map(d => ({ issue_date: String(d.issue_date).slice(0, 10), total: Number(d.total ?? 0) }));

        // Solo las líneas de los dos años que compara la ficha.
        const year = Number(today.slice(0, 4));
        const dateById = new Map(docs.filter(d => Number(String(d.issue_date).slice(0, 4)) >= year - 1).map(d => [d.id, String(d.issue_date).slice(0, 10)]));
        const ids = [...dateById.keys()];
        let lines: SaleLineRow[] = [];
        if (ids.length > 0) {
            const raw = await fetchAllRows<{ document_id: string; line_total: number | null; description: string | null; product: { name?: string } | { name?: string }[] | null }>(
                ({ from, to }) => client
                    .from('document_lines')
                    .select('document_id, line_total, description, product:products(name)')
                    .in('document_id', ids)
                    .order('id')
                    .range(from, to),
                { label: 'crm_visits.snapshot.lines' },
            );
            lines = raw.map(l => ({
                issue_date: dateById.get(l.document_id) ?? '',
                product_name: one(l.product)?.name || l.description || 'Sin producto',
                line_total: Number(l.line_total ?? 0),
            }));
        }
        return buildSnapshot(partyId, today, sales, lines);
    },
};
