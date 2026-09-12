'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const HEXDESK_URL = process.env.HEXDESK_API_URL
const HEXDESK_KEY = process.env.HEXDESK_API_KEY

const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical']
const VALID_CATEGORIES = [
    'hardware', 'software', 'network', 'access', 'email', 'security',
    'application', 'service_request', 'support', 'other', 'development',
    'billing', 'onboarding',
]

export interface SupportTicketResult {
    success: boolean
    error?: string
    warning?: string
    synced?: boolean
    id?: string
    ticket_number?: number | null
}

/**
 * Crea un caso de soporte sobre la aplicación: guarda copia local (RLS por tenant),
 * sube la captura opcional y lo envía a HexDesk vía API REST (x-api-key).
 * Nunca lanza: si HexDesk falla, el caso queda guardado localmente (synced=false).
 */
export async function submitSupportTicketAction(formData: FormData): Promise<SupportTicketResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const subject = String(formData.get('subject') || '').trim()
    const description = String(formData.get('description') || '').trim()
    let priority = String(formData.get('priority') || 'medium')
    let category = String(formData.get('category') || 'application')
    const pageUrl = String(formData.get('page_url') || '')
    const userAgent = String(formData.get('user_agent') || '')
    const file = formData.get('screenshot') as File | null

    if (!subject || !description) return { success: false, error: 'Completa el asunto y la descripción' }
    if (!VALID_PRIORITIES.includes(priority)) priority = 'medium'
    if (!VALID_CATEGORIES.includes(category)) category = 'application'

    const { data: tenantId } = await supabase.rpc('get_my_tenant_id')
    if (!tenantId) return { success: false, error: 'No se pudo obtener la empresa' }

    const admin = createAdminClient()
    const [{ data: tenant }, { data: profile }] = await Promise.all([
        admin.from('tenants').select('name').eq('id', tenantId).maybeSingle(),
        admin.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle(),
    ])
    const requesterEmail = profile?.email || user.email || null

    const context = {
        empresa: tenant?.name ?? null,
        usuario: profile?.full_name ?? null,
        email: requesterEmail,
        modulo_url: pageUrl || null,
        navegador: userAgent || null,
        app: 'GVM Corp',
    }

    // 1. Copia local
    const { data: local, error: insErr } = await supabase
        .from('app_support_tickets')
        .insert({
            tenant_id: tenantId,
            created_by: user.id,
            subject,
            description,
            priority,
            category,
            requester_email: requesterEmail,
            context,
            status: 'open',
            synced: false,
        })
        .select('id')
        .single()

    if (insErr || !local) return { success: false, error: insErr?.message || 'No se pudo guardar el caso' }

    // 2. Captura opcional → bucket privado + URL firmada (1 año) para que HexDesk pueda abrirla
    let screenshotUrl: string | null = null
    if (file && file.size > 0) {
        try {
            const ext = (file.name.split('.').pop() || 'png').toLowerCase()
            const path = `${tenantId}/${local.id}.${ext}`
            const buf = Buffer.from(await file.arrayBuffer())
            const { error: upErr } = await admin.storage
                .from('support-attachments')
                .upload(path, buf, { contentType: file.type || 'image/png', upsert: true })
            if (!upErr) {
                const { data: signed } = await admin.storage
                    .from('support-attachments')
                    .createSignedUrl(path, 60 * 60 * 24 * 365)
                screenshotUrl = signed?.signedUrl ?? null
                if (screenshotUrl) {
                    await supabase.from('app_support_tickets').update({ screenshot_url: screenshotUrl }).eq('id', local.id)
                }
            }
        } catch (e) {
            console.error('[support] fallo subiendo captura (no crítico):', e)
        }
    }

    // 3. Descripción enriquecida con contexto + captura
    const ctxLines = [
        '— Enviado desde GVM Corp —',
        `Empresa: ${context.empresa ?? '—'}`,
        `Usuario: ${context.usuario ?? '—'} (${requesterEmail ?? '—'})`,
        context.modulo_url ? `Módulo/URL: ${context.modulo_url}` : null,
        context.navegador ? `Navegador: ${context.navegador}` : null,
        screenshotUrl ? `Captura: ${screenshotUrl}` : null,
    ].filter(Boolean).join('\n')
    const fullDescription = `${description}\n\n${ctxLines}`

    // 4. Envío a HexDesk
    if (!HEXDESK_URL || !HEXDESK_KEY) {
        return { success: true, synced: false, id: local.id, warning: 'Caso guardado. La integración con HexDesk aún no está configurada.' }
    }

    try {
        const res = await fetch(HEXDESK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': HEXDESK_KEY },
            body: JSON.stringify({
                title: subject,
                description: fullDescription,
                priority,
                category,
                requester_email: requesterEmail ?? undefined,
                external_ref: local.id,
            }),
        })

        if (!res.ok) {
            const txt = await res.text().catch(() => '')
            console.error('[support] HexDesk respondió', res.status, txt)
            return { success: true, synced: false, id: local.id, warning: 'El caso quedó guardado; no se pudo enviar a HexDesk en este momento.' }
        }

        const json = await res.json().catch(() => null)
        const hexId = json?.data?.id ?? null
        const hexNum = json?.data?.ticket_number ?? null
        const hexStatus = json?.data?.status ?? 'open'

        await supabase.from('app_support_tickets').update({
            hexdesk_id: hexId,
            hexdesk_ticket_number: hexNum,
            status: hexStatus,
            synced: true,
            updated_at: new Date().toISOString(),
        }).eq('id', local.id)

        revalidatePath('/help')
        return { success: true, synced: true, id: local.id, ticket_number: hexNum }
    } catch (e) {
        console.error('[support] fetch a HexDesk falló:', e)
        return { success: true, synced: false, id: local.id, warning: 'El caso quedó guardado; no se pudo enviar a HexDesk en este momento.' }
    }
}

export interface SupportTicketRow {
    id: string
    subject: string
    priority: string
    category: string
    status: string
    hexdesk_ticket_number: number | null
    synced: boolean
    created_at: string
}

/** Lista los casos de soporte del tenant del usuario (más recientes primero). */
export async function getMySupportTicketsAction(): Promise<SupportTicketRow[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
        .from('app_support_tickets')
        .select('id, subject, priority, category, status, hexdesk_ticket_number, synced, created_at')
        .order('created_at', { ascending: false })
        .limit(20)

    return (data ?? []) as SupportTicketRow[]
}
