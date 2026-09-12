import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { commercialService } from '@/features/commercial/services/commercialService'
import { CommercialRequestForm } from '@/features/commercial/components/CommercialRequestForm'
import { Button } from '@/shared/components/ui/button'
import type { CommercialItemRow, CommercialRequestInput } from '@/features/commercial/types'

export const metadata = { title: 'Editar solicitud comercial — GVM Corp' }

export default async function EditCommercialPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const req = await commercialService.getById(supabase, id)
    if (!req) notFound()
    const r = req as Record<string, any>

    // Solo el solicitante puede editar, y solo borradores o rechazadas.
    if (r.requester_id !== user.id || !['DRAFT', 'REJECTED'].includes(r.status)) {
        redirect(`/commercial/${id}`)
    }

    const [partiesRes, oppsRes] = await Promise.all([
        supabase.from('parties').select('id, legal_name').order('legal_name').limit(300),
        supabase.from('crm_opportunities').select('id, name')
            .not('stage', 'in', '("CLOSED_WON","CLOSED_LOST")').order('created_at', { ascending: false }).limit(200),
    ])

    const items = (r.items ?? []) as CommercialItemRow[]
    const initialData: Partial<CommercialRequestInput> = {
        title: r.title ?? '',
        purpose: r.purpose ?? '',
        destination: r.destination ?? '',
        start_date: r.start_date ?? '',
        end_date: r.end_date ?? '',
        party_id: r.party_id ?? '',
        opportunity_id: r.opportunity_id ?? '',
        items: items.map((it) => ({
            type: it.type,
            description: it.description ?? '',
            schedule: it.schedule ?? '',
            quantity: Number(it.quantity),
            unit_cost: Number(it.unit_cost),
            notes: it.notes ?? '',
        })),
    }

    return (
        <div className="page-container space-y-6 pb-24 animate-in fade-in duration-500">
            <Button variant="ghost" asChild className="h-9 px-3 rounded-xl text-slate-400 hover:text-slate-900 text-[10px] font-black uppercase tracking-widest gap-2 w-fit">
                <Link href={`/commercial/${id}`}><ArrowLeft className="h-3.5 w-3.5" /> Volver</Link>
            </Button>
            <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Editar solicitud {r.number}</h1>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Ajusta los conceptos y guarda o envía a aprobación.</p>
            </div>
            <CommercialRequestForm
                parties={partiesRes.data ?? []}
                opportunities={oppsRes.data ?? []}
                requestId={id}
                initialData={initialData}
            />
        </div>
    )
}
