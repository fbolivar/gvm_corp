'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface PaymentReport {
    id: string
    document_id: string
    party_id: string
    tenant_id: string
    amount: number
    notes: string | null
    evidence_url: string | null
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    reviewed_by: string | null
    reviewer_notes: string | null
    created_at: string
    updated_at: string
    document?: { number: string; total: number; doc_type: string } | null
    party?: { legal_name: string; doc_number: string } | null
}

// ─── getPaymentReportsAction ─────────────────────────────────────────────────

export async function getPaymentReportsAction(
    filter: 'PENDING' | 'ALL' = 'ALL'
): Promise<{ data: PaymentReport[]; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [], error: 'No autenticado' }

    let query = supabase
        .from('payment_reports')
        .select(`
            *,
            document:documents(number, total, doc_type),
            party:parties(legal_name, doc_number)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

    if (filter === 'PENDING') {
        query = query.eq('status', 'PENDING')
    }

    const { data, error } = await query
    if (error) return { data: [], error: error.message }
    return { data: (data as PaymentReport[]) ?? [] }
}

// ─── approvePaymentReportAction ──────────────────────────────────────────────

export async function approvePaymentReportAction(
    reportId: string,
    reviewerNotes?: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    // Fetch report to get document_id
    const { data: report, error: fetchErr } = await supabase
        .from('payment_reports')
        .select('document_id')
        .eq('id', reportId)
        .single()

    if (fetchErr || !report) return { success: false, error: 'Reporte no encontrado' }

    // 1. Approve the report
    const { error: updateErr } = await supabase
        .from('payment_reports')
        .update({
            status: 'APPROVED',
            reviewed_by: user.id,
            reviewer_notes: reviewerNotes || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', reportId)

    if (updateErr) return { success: false, error: updateErr.message }

    // 2. Mark document as PAID
    await supabase
        .from('documents')
        .update({ status: 'PAID' })
        .eq('id', report.document_id)

    revalidatePath('/accounting/cartera')
    revalidatePath('/accounting/cartera/cobros')
    revalidatePath('/sales/invoices')
    return { success: true }
}

// ─── rejectPaymentReportAction ───────────────────────────────────────────────

export async function rejectPaymentReportAction(
    reportId: string,
    reviewerNotes: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const { error } = await supabase
        .from('payment_reports')
        .update({
            status: 'REJECTED',
            reviewed_by: user.id,
            reviewer_notes: reviewerNotes,
            updated_at: new Date().toISOString(),
        })
        .eq('id', reportId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/accounting/cartera/cobros')
    return { success: true }
}
