import { z } from 'zod'

export const PaymentMethodEnum = z.enum([
    'PSE',
    'NEQUI',
    'BANCOLOMBIA_TRANSFER',
    'CASH',
])

export type PaymentMethod = z.infer<typeof PaymentMethodEnum>

export const PaymentLinkStatusEnum = z.enum([
    'PENDING',
    'PAID',
    'EXPIRED',
    'CANCELLED',
])

export type PaymentLinkStatus = z.infer<typeof PaymentLinkStatusEnum>

export const paymentLinkSchema = z.object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    document_id: z.string().uuid(),
    token: z.string(),
    amount: z.number(),
    currency: z.string().default('COP'),
    status: PaymentLinkStatusEnum,
    payment_method: PaymentMethodEnum.nullable().optional(),
    payer_name: z.string().nullable().optional(),
    payer_email: z.string().nullable().optional(),
    payer_doc: z.string().nullable().optional(),
    bank_reference: z.string().nullable().optional(),
    expires_at: z.string(),
    paid_at: z.string().nullable().optional(),
    created_at: z.string(),
})

export type PaymentLink = z.infer<typeof paymentLinkSchema>

/** Datos del link público (incluye info del documento y tenant para renderizado) */
export interface PublicPaymentLinkData {
    id: string
    token: string
    amount: number
    currency: string
    status: PaymentLinkStatus
    expires_at: string
    document: {
        id: string
        number: string
        doc_type: string
        issue_date: string | null
    }
    tenant: {
        legal_name: string
        nit: string
    }
    party: {
        legal_name: string
        doc_number: string
    } | null
}

export const processPaymentSchema = z.object({
    token: z.string().min(1),
    payment_method: PaymentMethodEnum,
    payer_name: z.string().min(2, 'Nombre requerido'),
    payer_email: z.string().email('Email inválido'),
    payer_doc: z.string().min(5, 'Documento requerido'),
})

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>

export interface ProcessPaymentResult {
    success: boolean
    reference: string
    amount: number
    payment_method: PaymentMethod
}

export interface CreateLinkResult {
    token: string
    url: string
    amount: number
    currency: string
    expires_at: string
}
