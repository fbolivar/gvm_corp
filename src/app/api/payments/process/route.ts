import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const requestSchema = z.object({
    token: z.string().min(1, 'Token requerido'),
    payment_method: z.enum(['PSE', 'NEQUI', 'BANCOLOMBIA_TRANSFER', 'CASH']).refine(
        (val) => ['PSE', 'NEQUI', 'BANCOLOMBIA_TRANSFER', 'CASH'].includes(val),
        { message: 'Método de pago inválido.' }
    ),
    payer_name: z.string().min(2, 'Nombre completo requerido (mínimo 2 caracteres)'),
    payer_email: z.string().email('Email inválido'),
    payer_doc: z.string().min(5, 'Número de documento requerido (mínimo 5 caracteres)'),
})

/**
 * Ruta PÚBLICA (sin autenticación requerida).
 * Procesa el pago de un link generado previamente.
 * Usa el admin client (SERVICE_ROLE_KEY) para omitir RLS en escrituras.
 */
export async function POST(req: NextRequest) {
    const adminClient = createAdminClient()

    try {
        // 1. Parsear y validar body
        let body: unknown
        try {
            body = await req.json()
        } catch {
            return NextResponse.json(
                { error: 'El cuerpo de la solicitud no es JSON válido.' },
                { status: 400 }
            )
        }

        const parsed = requestSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0].message },
                { status: 400 }
            )
        }

        const { token, payment_method, payer_name, payer_email, payer_doc } = parsed.data

        // 2. Buscar el payment link por token
        const { data: paymentLink, error: fetchError } = await adminClient
            .from('payment_links')
            .select('id, status, amount, document_id, expires_at, tenant_id')
            .eq('token', token)
            .maybeSingle()

        if (fetchError) {
            console.error('[process] Error buscando payment_link:', fetchError)
            return NextResponse.json(
                { error: 'Error al consultar el link de pago.' },
                { status: 500 }
            )
        }

        if (!paymentLink) {
            return NextResponse.json(
                { error: 'Link de pago no encontrado o token inválido.' },
                { status: 404 }
            )
        }

        // 3. Validar estado del link
        if (paymentLink.status === 'PAID') {
            return NextResponse.json(
                { error: 'Este link ya fue procesado. El pago ya fue registrado.' },
                { status: 409 }
            )
        }

        if (paymentLink.status === 'EXPIRED' || paymentLink.status === 'CANCELLED') {
            return NextResponse.json(
                { error: `Este link de pago está ${paymentLink.status === 'EXPIRED' ? 'vencido' : 'cancelado'}.` },
                { status: 410 }
            )
        }

        // Verificar expiración por fecha (en caso que el status no se haya actualizado)
        if (new Date(paymentLink.expires_at) < new Date()) {
            // Marcar como expirado automáticamente
            await adminClient
                .from('payment_links')
                .update({ status: 'EXPIRED' })
                .eq('id', paymentLink.id)

            return NextResponse.json(
                { error: 'El link de pago ha vencido. Solicita uno nuevo.' },
                { status: 410 }
            )
        }

        // 4. Simular procesamiento bancario (ACH Colombia / PSE latencia)
        await new Promise<void>((resolve) => setTimeout(resolve, 1500))

        // 5. Generar referencia bancaria única
        const bank_reference = `REF-${Date.now()}`

        // 6. Actualizar payment_link como PAID
        const { error: updateLinkError } = await adminClient
            .from('payment_links')
            .update({
                status: 'PAID',
                payment_method,
                payer_name,
                payer_email,
                payer_doc,
                bank_reference,
                paid_at: new Date().toISOString(),
            })
            .eq('id', paymentLink.id)

        if (updateLinkError) {
            console.error('[process] Error actualizando payment_link:', updateLinkError)
            return NextResponse.json(
                { error: 'Error al registrar el pago. Contacta a soporte.' },
                { status: 500 }
            )
        }

        // 7. Actualizar el documento: status='PAID' y balance=0 si el pago cubre el saldo
        const { data: document, error: docFetchError } = await adminClient
            .from('documents')
            .select('id, balance, total, status')
            .eq('id', paymentLink.document_id)
            .maybeSingle()

        if (!docFetchError && document) {
            const docBalance = Number(document.balance ?? document.total ?? 0)
            const paidAmount = Number(paymentLink.amount)

            // Solo marcar PAID si el pago cubre el saldo completo
            const newBalance = Math.max(0, docBalance - paidAmount)
            const newStatus = newBalance === 0 ? 'PAID' : document.status

            await adminClient
                .from('documents')
                .update({
                    balance: newBalance,
                    status: newStatus,
                })
                .eq('id', paymentLink.document_id)
        }

        console.info(`[process] Pago procesado. Ref: ${bank_reference}, Link: ${paymentLink.id}`)

        return NextResponse.json({
            success: true,
            reference: bank_reference,
            amount: paymentLink.amount,
            payment_method,
        })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno del servidor'
        console.error('[process] Error inesperado:', message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
