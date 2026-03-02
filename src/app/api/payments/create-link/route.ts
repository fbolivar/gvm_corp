import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const requestSchema = z.object({
    document_id: z.string().uuid('document_id debe ser un UUID válido'),
})

export async function POST(req: NextRequest) {
    try {
        // 1. Autenticar usuario
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'No autenticado. Inicia sesión para continuar.' },
                { status: 401 }
            )
        }

        // 2. Validar body
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

        const { document_id } = parsed.data

        // 3. Obtener tenant_id del usuario actual via RPC
        const { data: tenantId, error: tenantError } = await supabase
            .rpc('get_my_tenant_id')

        if (tenantError || !tenantId) {
            console.error('[create-link] Error obteniendo tenant_id:', tenantError)
            return NextResponse.json(
                { error: 'No se pudo determinar el tenant del usuario.' },
                { status: 403 }
            )
        }

        // 4. Buscar y validar el documento
        const { data: doc, error: docError } = await supabase
            .from('documents')
            .select('id, doc_type, status, total, balance, number, party:parties(legal_name, email)')
            .eq('id', document_id)
            .eq('tenant_id', tenantId)
            .maybeSingle()

        if (docError) {
            console.error('[create-link] Error consultando documento:', docError)
            return NextResponse.json(
                { error: 'Error al consultar el documento.' },
                { status: 500 }
            )
        }

        if (!doc) {
            return NextResponse.json(
                { error: 'Documento no encontrado o no pertenece a tu empresa.' },
                { status: 404 }
            )
        }

        // 5. Validar reglas de negocio
        if (doc.doc_type !== 'INVOICE') {
            return NextResponse.json(
                { error: 'Solo se pueden crear links de pago para Facturas de Venta.' },
                { status: 422 }
            )
        }

        if (doc.status === 'PAID') {
            return NextResponse.json(
                { error: 'Esta factura ya fue pagada.' },
                { status: 422 }
            )
        }

        const balanceAmount = Number(doc.balance ?? doc.total ?? 0)

        if (balanceAmount <= 0) {
            return NextResponse.json(
                { error: 'El saldo pendiente de esta factura es cero o negativo.' },
                { status: 422 }
            )
        }

        // 6. Crear el payment link (el token lo genera la DB via DEFAULT)
        const { data: paymentLink, error: insertError } = await supabase
            .from('payment_links')
            .insert({
                tenant_id: tenantId,
                document_id,
                amount: balanceAmount,
                currency: 'COP',
                status: 'PENDING',
            })
            .select('id, token, amount, expires_at')
            .single()

        if (insertError) {
            console.error('[create-link] Error creando payment_link:', insertError)
            return NextResponse.json(
                { error: 'No se pudo crear el link de pago. Intenta nuevamente.' },
                { status: 500 }
            )
        }

        const baseUrl = req.nextUrl.origin
        const payUrl = `${baseUrl}/pay/${paymentLink.token}`

        console.info(`[create-link] Link creado: ${payUrl} para doc ${document_id}`)

        return NextResponse.json({
            token: paymentLink.token,
            url: payUrl,
            amount: paymentLink.amount,
            currency: 'COP',
            expires_at: paymentLink.expires_at,
        })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno del servidor'
        console.error('[create-link] Error inesperado:', message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
