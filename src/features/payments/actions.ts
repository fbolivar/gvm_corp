'use server'

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import type { CreateLinkResult } from './types'

/**
 * Crea un link de pago para una factura.
 * Llama al API Route interno /api/payments/create-link.
 *
 * @param documentId - UUID del documento (debe ser INVOICE con balance > 0)
 * @returns { token, url, amount, currency, expires_at } o { error }
 */
export async function createPaymentLinkAction(
    documentId: string
): Promise<CreateLinkResult | { error: string }> {
    const supabase = await createClient()

    // Verificar sesión activa
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'No autenticado.' }
    }

    // Construir la URL base desde los headers de la request actual
    const headersList = await headers()
    const host = headersList.get('host') ?? 'localhost:3000'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'
    const baseUrl = `${protocol}://${host}`

    // Obtener las cookies de sesión para pasar autenticación al API route
    const cookieHeader = headersList.get('cookie') ?? ''

    try {
        const response = await fetch(`${baseUrl}/api/payments/create-link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Pasar cookies para que el API route autentique la sesión
                cookie: cookieHeader,
            },
            body: JSON.stringify({ document_id: documentId }),
        })

        const data = await response.json()

        if (!response.ok) {
            return { error: data.error ?? 'Error al crear el link de pago.' }
        }

        return data as CreateLinkResult
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error de red al crear el link.'
        console.error('[createPaymentLinkAction] Error:', message)
        return { error: message }
    }
}
