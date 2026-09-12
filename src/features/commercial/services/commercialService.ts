import { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CommercialRequestInput } from '../types'

const SELECT_LIST = `
    *,
    requester:commercial_requests_requester_fkey(full_name, email),
    approver:commercial_requests_approver_fkey(full_name, email),
    party:commercial_requests_party_fkey(legal_name)
`

export const commercialService = {
    async getTenantId(client: SupabaseClient): Promise<string | null> {
        const { data } = await client.rpc('get_my_tenant_id')
        return (data as string) ?? null
    },

    /** ¿El usuario actual puede aprobar?
     *  Si el tenant tiene una lista explícita de aprobadores (commercial_approvers),
     *  esa lista MANDA (solo esos usuarios aprueban). Si está vacía, cae al esquema
     *  por rol (can_admin en el módulo commercial o Super Admin). */
    async isApprover(client: SupabaseClient): Promise<boolean> {
        const { data: { user } } = await client.auth.getUser()
        if (!user) return false

        const tenantId = await this.getTenantId(client)
        if (tenantId) {
            const { data: explicit } = await client
                .from('commercial_approvers')
                .select('user_id')
                .eq('tenant_id', tenantId)
            if (explicit && explicit.length > 0) {
                return explicit.some((r) => r.user_id === user.id)
            }
        }

        const { data: ut } = await client
            .from('user_tenants')
            .select('role_id, role')
            .eq('user_id', user.id)
            .maybeSingle()
        if (!ut) return false
        if (['admin', 'owner'].includes((ut.role as string) || '')) return true
        if (ut.role_id) {
            const { data: roleRow } = await client.from('app_roles').select('name').eq('id', ut.role_id).maybeSingle()
            if (roleRow?.name === 'SUPER ADMINISTRADOR') return true
            const { data: perm } = await client
                .from('role_permissions')
                .select('can_admin')
                .eq('role_id', ut.role_id)
                .eq('module_key', 'commercial')
                .maybeSingle()
            return !!perm?.can_admin
        }
        return false
    },

    /** IDs de usuarios del tenant que pueden aprobar (para notificarles).
     *  Prioriza la lista explícita (commercial_approvers); si no hay, usa los roles. */
    async approverUserIds(tenantId: string): Promise<string[]> {
        const admin = createAdminClient()

        const { data: explicit } = await admin
            .from('commercial_approvers')
            .select('user_id')
            .eq('tenant_id', tenantId)
        if (explicit && explicit.length > 0) {
            return explicit.map((r) => r.user_id as string)
        }

        const { data: roleRows } = await admin
            .from('role_permissions')
            .select('role_id')
            .eq('module_key', 'commercial')
            .eq('can_admin', true)
        const roleIds = new Set<string>((roleRows ?? []).map((r) => r.role_id as string))
        const { data: superRole } = await admin.from('app_roles').select('id').eq('name', 'SUPER ADMINISTRADOR').maybeSingle()
        if (superRole?.id) roleIds.add(superRole.id as string)
        if (roleIds.size === 0) return []
        const { data: uts } = await admin
            .from('user_tenants')
            .select('user_id')
            .eq('tenant_id', tenantId)
            .in('role_id', Array.from(roleIds))
        return (uts ?? []).map((u) => u.user_id as string)
    },

    async getMyRequests(client: SupabaseClient, userId: string) {
        const { data, error } = await client
            .from('commercial_requests')
            .select(SELECT_LIST)
            .eq('requester_id', userId)
            .order('created_at', { ascending: false })
        if (error) { console.error('[commercial] getMyRequests:', error.message); return [] }
        return data ?? []
    },

    async getAllRequests(client: SupabaseClient, status?: string) {
        let q = client.from('commercial_requests').select(SELECT_LIST).order('created_at', { ascending: false })
        if (status && status !== 'ALL') q = q.eq('status', status)
        const { data, error } = await q
        if (error) { console.error('[commercial] getAllRequests:', error.message); return [] }
        return data ?? []
    },

    async getPending(client: SupabaseClient) {
        const { data, error } = await client
            .from('commercial_requests')
            .select(SELECT_LIST)
            .eq('status', 'SUBMITTED')
            .order('submitted_at', { ascending: true })
        if (error) { console.error('[commercial] getPending:', error.message); return [] }
        return data ?? []
    },

    async getById(client: SupabaseClient, id: string) {
        const { data, error } = await client
            .from('commercial_requests')
            .select(`
                ${SELECT_LIST},
                items:commercial_request_items(*),
                events:commercial_request_events(*, actor:commercial_request_events_actor_fkey(full_name))
            `)
            .eq('id', id)
            .single()
        if (error) { console.error('[commercial] getById:', error.message); return null }
        return data
    },

    async logEvent(client: SupabaseClient, args: {
        request_id: string; tenant_id: string; actor_id: string | null;
        action: string; from_status?: string | null; to_status?: string | null; notes?: string | null
    }) {
        await client.from('commercial_request_events').insert({
            request_id: args.request_id,
            tenant_id: args.tenant_id,
            actor_id: args.actor_id,
            action: args.action,
            from_status: args.from_status ?? null,
            to_status: args.to_status ?? null,
            notes: args.notes ?? null,
        })
    },

    async notify(client: SupabaseClient, userIds: string[], tenantId: string, data: { title: string; body: string; link: string }) {
        if (userIds.length === 0) return
        const rows = userIds.map((uid) => ({
            user_id: uid, tenant_id: tenantId, category: 'GENERAL', priority: 'MEDIUM', ...data,
        }))
        const { error } = await client.from('app_notifications').insert(rows)
        if (error) console.error('[commercial] notify:', error.message)
    },

    async create(client: SupabaseClient, input: CommercialRequestInput, submit: boolean) {
        const { data: { user } } = await client.auth.getUser()
        if (!user) throw new Error('No autenticado')
        const tenantId = await this.getTenantId(client)
        if (!tenantId) throw new Error('No se encontró la empresa')

        const total = input.items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_cost), 0)
        const status = submit ? 'SUBMITTED' : 'DRAFT'

        const { data: header, error: headerErr } = await client
            .from('commercial_requests')
            .insert({
                tenant_id: tenantId,
                requester_id: user.id,
                title: input.title,
                purpose: input.purpose || null,
                destination: input.destination || null,
                start_date: input.start_date || null,
                end_date: input.end_date || null,
                party_id: input.party_id || null,
                opportunity_id: input.opportunity_id || null,
                total_estimated: total,
                status,
                submitted_at: submit ? new Date().toISOString() : null,
            })
            .select('id, number')
            .single()
        if (headerErr || !header) throw new Error(headerErr?.message || 'No se pudo crear la solicitud')

        const items = input.items.map((i) => ({
            request_id: header.id,
            tenant_id: tenantId,
            type: i.type,
            description: i.description,
            schedule: i.schedule || null,
            quantity: Number(i.quantity),
            unit_cost: Number(i.unit_cost),
            subtotal: Number(i.quantity) * Number(i.unit_cost),
            notes: i.notes || null,
        }))
        const { error: itemsErr } = await client.from('commercial_request_items').insert(items)
        if (itemsErr) throw new Error(itemsErr.message)

        await this.logEvent(client, {
            request_id: header.id, tenant_id: tenantId, actor_id: user.id,
            action: submit ? 'SUBMIT' : 'CREATE', to_status: status,
        })

        if (submit) {
            const approvers = await this.approverUserIds(tenantId)
            await this.notify(client, approvers.filter((a) => a !== user.id), tenantId, {
                title: `Nueva solicitud comercial ${header.number ?? ''}`,
                body: `${input.title} — requiere tu aprobación.`,
                link: `/commercial/${header.id}`,
            })
        }
        return { id: header.id as string, number: header.number as string }
    },

    async update(client: SupabaseClient, id: string, input: CommercialRequestInput) {
        const { data: { user } } = await client.auth.getUser()
        if (!user) throw new Error('No autenticado')
        const tenantId = await this.getTenantId(client)
        if (!tenantId) throw new Error('No se encontró la empresa')

        const { data: req } = await client.from('commercial_requests').select('status, requester_id').eq('id', id).single()
        if (!req) throw new Error('Solicitud no encontrada')
        if (req.requester_id !== user.id) throw new Error('Solo el solicitante puede editar la solicitud')
        if (!['DRAFT', 'REJECTED'].includes(req.status)) throw new Error('Solo se pueden editar borradores o solicitudes rechazadas')

        const total = input.items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_cost), 0)

        const { error: hErr } = await client.from('commercial_requests').update({
            title: input.title,
            purpose: input.purpose || null,
            destination: input.destination || null,
            start_date: input.start_date || null,
            end_date: input.end_date || null,
            party_id: input.party_id || null,
            opportunity_id: input.opportunity_id || null,
            total_estimated: total,
            status: 'DRAFT',
            submitted_at: null,
            decision_notes: null,
            updated_at: new Date().toISOString(),
        }).eq('id', id)
        if (hErr) throw new Error(hErr.message)

        // Reemplazar líneas
        await client.from('commercial_request_items').delete().eq('request_id', id)
        const items = input.items.map((i) => ({
            request_id: id, tenant_id: tenantId, type: i.type, description: i.description,
            schedule: i.schedule || null,
            quantity: Number(i.quantity), unit_cost: Number(i.unit_cost),
            subtotal: Number(i.quantity) * Number(i.unit_cost), notes: i.notes || null,
        }))
        const { error: iErr } = await client.from('commercial_request_items').insert(items)
        if (iErr) throw new Error(iErr.message)

        await this.logEvent(client, { request_id: id, tenant_id: tenantId, actor_id: user.id, action: 'UPDATE', to_status: 'DRAFT' })
    },

    async submit(client: SupabaseClient, id: string) {
        const { data: { user } } = await client.auth.getUser()
        if (!user) throw new Error('No autenticado')
        const tenantId = await this.getTenantId(client)
        if (!tenantId) throw new Error('No se encontró la empresa')

        const { data: req } = await client.from('commercial_requests').select('status, number, title, requester_id').eq('id', id).single()
        if (!req) throw new Error('Solicitud no encontrada')
        if (!['DRAFT', 'REJECTED'].includes(req.status)) throw new Error('Solo se pueden enviar solicitudes en borrador')

        const { error } = await client.from('commercial_requests')
            .update({ status: 'SUBMITTED', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString(), decision_notes: null })
            .eq('id', id)
        if (error) throw new Error(error.message)

        await this.logEvent(client, { request_id: id, tenant_id: tenantId, actor_id: user.id, action: 'SUBMIT', from_status: req.status, to_status: 'SUBMITTED' })
        const approvers = await this.approverUserIds(tenantId)
        await this.notify(client, approvers.filter((a) => a !== user.id), tenantId, {
            title: `Solicitud comercial ${req.number ?? ''}`,
            body: `${req.title} — requiere tu aprobación.`,
            link: `/commercial/${id}`,
        })
    },

    async decide(client: SupabaseClient, id: string, decision: 'APPROVED' | 'REJECTED', notes?: string) {
        const { data: { user } } = await client.auth.getUser()
        if (!user) throw new Error('No autenticado')
        if (!(await this.isApprover(client))) throw new Error('No tienes permiso para aprobar solicitudes')
        const tenantId = await this.getTenantId(client)
        if (!tenantId) throw new Error('No se encontró la empresa')

        const { data: req } = await client.from('commercial_requests').select('status, number, requester_id').eq('id', id).single()
        if (!req) throw new Error('Solicitud no encontrada')
        if (req.status !== 'SUBMITTED') throw new Error('Solo se pueden decidir solicitudes pendientes')

        const { error } = await client.from('commercial_requests')
            .update({ status: decision, approver_id: user.id, decided_at: new Date().toISOString(), decision_notes: notes || null, updated_at: new Date().toISOString() })
            .eq('id', id)
        if (error) throw new Error(error.message)

        await this.logEvent(client, { request_id: id, tenant_id: tenantId, actor_id: user.id, action: decision === 'APPROVED' ? 'APPROVE' : 'REJECT', from_status: 'SUBMITTED', to_status: decision, notes })
        await this.notify(client, [req.requester_id as string].filter((u) => u !== user.id), tenantId, {
            title: `Solicitud ${req.number ?? ''} ${decision === 'APPROVED' ? 'aprobada' : 'rechazada'}`,
            body: decision === 'APPROVED' ? 'Tu solicitud fue aprobada.' : `Tu solicitud fue rechazada. ${notes ? 'Motivo: ' + notes : ''}`,
            link: `/commercial/${id}`,
        })
    },

    async liquidate(client: SupabaseClient, id: string, actuals: { item_id: string; actual_cost: number }[]) {
        const { data: { user } } = await client.auth.getUser()
        if (!user) throw new Error('No autenticado')
        const tenantId = await this.getTenantId(client)
        if (!tenantId) throw new Error('No se encontró la empresa')

        const { data: req } = await client.from('commercial_requests').select('status').eq('id', id).single()
        if (!req) throw new Error('Solicitud no encontrada')
        if (req.status !== 'APPROVED') throw new Error('Solo se pueden liquidar solicitudes aprobadas')

        let total = 0
        for (const a of actuals) {
            total += Number(a.actual_cost) || 0
            await client.from('commercial_request_items').update({ actual_cost: Number(a.actual_cost) || 0 }).eq('id', a.item_id).eq('request_id', id)
        }
        const { error } = await client.from('commercial_requests')
            .update({ status: 'LIQUIDATED', total_actual: total, liquidated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', id)
        if (error) throw new Error(error.message)

        await this.logEvent(client, { request_id: id, tenant_id: tenantId, actor_id: user.id, action: 'LIQUIDATE', from_status: 'APPROVED', to_status: 'LIQUIDATED', notes: `Total real: ${total}` })
    },

    // ─── Adjuntos ───────────────────────────────────────────────────────────
    async addAttachment(client: SupabaseClient, requestId: string, file: File, kind: string) {
        const { data: { user } } = await client.auth.getUser()
        if (!user) throw new Error('No autenticado')
        const tenantId = await this.getTenantId(client)
        if (!tenantId) throw new Error('No se encontró la empresa')

        const { data: req } = await client.from('commercial_requests').select('attachments').eq('id', requestId).single()
        if (!req) throw new Error('Solicitud no encontrada')

        const admin = createAdminClient()
        const safe = (file.name || 'archivo').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60)
        const stamp = `${requestId.slice(0, 8)}-${safe}`
        const path = `${tenantId}/${requestId}/${stamp}`
        const buf = Buffer.from(await file.arrayBuffer())
        const { error: upErr } = await admin.storage
            .from('commercial-attachments')
            .upload(path, buf, { contentType: file.type || 'application/octet-stream', upsert: true })
        if (upErr) throw new Error(upErr.message)

        const entry = { name: file.name, path, kind, size: file.size, uploaded_at: new Date().toISOString(), by: user.id }
        const attachments = [...((req.attachments as unknown[]) ?? []), entry]
        const { error } = await client.from('commercial_requests')
            .update({ attachments, updated_at: new Date().toISOString() }).eq('id', requestId)
        if (error) throw new Error(error.message)
        return entry
    },

    async removeAttachment(client: SupabaseClient, requestId: string, path: string) {
        const { data: req } = await client.from('commercial_requests').select('attachments, status').eq('id', requestId).single()
        if (!req) throw new Error('Solicitud no encontrada')
        if (req.status === 'LIQUIDATED') throw new Error('No se pueden modificar adjuntos de una solicitud liquidada')
        const admin = createAdminClient()
        await admin.storage.from('commercial-attachments').remove([path])
        const attachments = ((req.attachments as { path?: string }[]) ?? []).filter((a) => a.path !== path)
        const { error } = await client.from('commercial_requests')
            .update({ attachments, updated_at: new Date().toISOString() }).eq('id', requestId)
        if (error) throw new Error(error.message)
    },

    /** Genera URLs firmadas frescas para cada adjunto (no caducan “rotas”). */
    async signAttachments(attachments: Array<Record<string, unknown>> | null | undefined) {
        if (!attachments || attachments.length === 0) return []
        const admin = createAdminClient()
        const out: Array<{ name: string; path: string; kind: string; size: number; uploaded_at: string; url: string | null }> = []
        for (const a of attachments) {
            let url: string | null = (a.url as string) ?? null
            if (a.path) {
                const { data } = await admin.storage.from('commercial-attachments').createSignedUrl(a.path as string, 60 * 60)
                url = data?.signedUrl ?? null
            }
            out.push({
                name: (a.name as string) ?? 'archivo',
                path: (a.path as string) ?? '',
                kind: (a.kind as string) ?? 'Soporte',
                size: (a.size as number) ?? 0,
                uploaded_at: (a.uploaded_at as string) ?? '',
                url,
            })
        }
        return out
    },

    async remove(client: SupabaseClient, id: string) {
        const { data: req } = await client.from('commercial_requests').select('status').eq('id', id).single()
        if (!req) throw new Error('Solicitud no encontrada')
        if (!['DRAFT', 'REJECTED'].includes(req.status)) throw new Error('Solo se pueden eliminar borradores o solicitudes rechazadas')
        const { error } = await client.from('commercial_requests').delete().eq('id', id)
        if (error) throw new Error(error.message)
    },
}
