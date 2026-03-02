import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ClientDetailView } from '@/features/client-portal/components/ClientDetailView'
import type { ClientDocument, ClientPayment } from '@/features/client-portal/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load client
  const { data: client } = await supabase
    .from('parties')
    .select('id, legal_name, doc_number, email, phone, party_type')
    .eq('id', id)
    .maybeSingle()

  if (!client) notFound()

  // Load invoices
  const { data: rawInvoices } = await supabase
    .from('documents')
    .select('id, number, doc_type, issue_date, due_date, total, balance, status, party_id')
    .eq('party_id', id)
    .eq('doc_type', 'INVOICE')
    .order('issue_date', { ascending: false })

  const invoices: ClientDocument[] = (rawInvoices || []).map((inv) => ({
    id: inv.id,
    number: inv.number,
    doc_type: inv.doc_type,
    issue_date: inv.issue_date,
    due_date: inv.due_date,
    total: inv.total ?? 0,
    balance: inv.balance ?? 0,
    status: inv.status ?? 'DRAFT',
    party_id: inv.party_id,
  }))

  // Load payments by client name match
  const { data: rawPayments } = await supabase
    .from('treasury_transactions')
    .select('id, description, amount, transaction_type, date')
    .ilike('description', `%${client.legal_name}%`)
    .order('date', { ascending: false })
    .limit(50)

  const payments: ClientPayment[] = (rawPayments || []).map((p) => ({
    id: p.id,
    description: p.description,
    amount: p.amount ?? 0,
    transaction_type: p.transaction_type,
    date: p.date,
  }))

  return (
    <ClientDetailView
      client={client}
      invoices={invoices}
      payments={payments}
    />
  )
}
