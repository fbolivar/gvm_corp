import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import { ClientPortalHub } from '@/features/client-portal/components/ClientPortalHub'
import type { ClientSummary } from '@/features/client-portal/types'

export const metadata = { title: 'Portal del Cliente — GVM Corp' }

export default async function ClientPortalPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load all CLIENT parties
  const { data: parties } = await supabase
    .from('parties')
    .select('id, legal_name, doc_number, email, phone, party_type')
    .eq('is_customer', true)
    .order('legal_name')

  // Load all invoices for those clients
  const partyIds = (parties || []).map((p) => p.id)

  const { data: invoices } = partyIds.length > 0
    ? await supabase
        .from('documents')
        .select('id, party_id, total, balance, due_date, status')
        .in('party_id', partyIds)
        .eq('doc_type', 'INVOICE')
    : { data: [] }

  const now = new Date()

  // Aggregate per client
  const clients: ClientSummary[] = (parties || []).map((party) => {
    const partyInvoices = (invoices || []).filter((inv) => inv.party_id === party.id)
    const total_invoiced = partyInvoices.reduce((s, i) => s + (i.total || 0), 0)
    const total_paid = partyInvoices.reduce((s, i) => s + ((i.total || 0) - (i.balance || 0)), 0)
    const balance = partyInvoices.reduce((s, i) => s + (i.balance || 0), 0)
    const has_overdue = partyInvoices.some(
      (i) => i.balance > 0 && i.due_date && new Date(i.due_date) < now
    )
    return { ...party, total_invoiced, total_paid, balance, has_overdue }
  })

  const totalInvoiced = clients.reduce((s, c) => s + c.total_invoiced, 0)
  const totalPaid     = clients.reduce((s, c) => s + c.total_paid, 0)
  const totalOverdue  = clients
    .filter((c) => c.has_overdue)
    .reduce((s, c) => s + c.balance, 0)

  return (
    <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="bg-slate-900 rounded-2xl px-8 py-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.04] pointer-events-none">
          <Users className="h-36 w-36" />
        </div>
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
              <Users className="h-4 w-4 text-white" />
            </div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Modulo CRM</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Portal del Cliente</h1>
          <p className="text-slate-400 font-semibold text-xs">
            Visibilidad de cartera, facturas y estado de cuenta
          </p>
        </div>
      </div>

      {/* Hub */}
      <ClientPortalHub
        clients={clients}
        totalInvoiced={totalInvoiced}
        totalPaid={totalPaid}
        totalOverdue={totalOverdue}
      />
    </div>
  )
}
