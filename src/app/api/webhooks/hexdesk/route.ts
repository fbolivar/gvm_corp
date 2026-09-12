import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SECRET = process.env.HEXDESK_WEBHOOK_SECRET

/**
 * Webhook entrante de HexDesk. Evento: ticket.status_changed.
 * Verifica la firma HMAC-SHA256 (hex) del cuerpo crudo y sincroniza el estado
 * del caso local (app_support_tickets) por external_ref o hexdesk_id.
 */
export async function POST(req: NextRequest) {
    if (!SECRET) {
        console.error('[hexdesk-webhook] HEXDESK_WEBHOOK_SECRET no configurado')
        return NextResponse.json({ error: 'not configured' }, { status: 500 })
    }

    const raw = await req.text()
    const signature = req.headers.get('x-hexdesk-signature') || ''

    // Verificación de firma (timing-safe)
    let valid = false
    try {
        const expected = crypto.createHmac('sha256', SECRET).update(raw, 'utf8').digest('hex')
        const sigBuf = Buffer.from(signature, 'hex')
        const expBuf = Buffer.from(expected, 'hex')
        valid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)
    } catch {
        valid = false
    }
    if (!valid) {
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }

    let payload: { event?: string; ticket?: Record<string, unknown> }
    try {
        payload = JSON.parse(raw)
    } catch {
        return NextResponse.json({ error: 'bad json' }, { status: 400 })
    }

    const ticket = payload?.ticket
    if (!ticket || !ticket.status) {
        return NextResponse.json({ ok: true, skipped: true })
    }

    const admin = createAdminClient()
    const patch = {
        status: String(ticket.status),
        updated_at: new Date().toISOString(),
    }

    try {
        const externalRef = ticket.external_ref ? String(ticket.external_ref) : null
        const hexId = ticket.id ? String(ticket.id) : null

        if (externalRef) {
            await admin.from('app_support_tickets').update(patch).eq('id', externalRef)
        } else if (hexId) {
            await admin.from('app_support_tickets').update(patch).eq('hexdesk_id', hexId)
        }
    } catch (e) {
        console.error('[hexdesk-webhook] error actualizando estado:', e)
        return NextResponse.json({ error: 'update failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
}
