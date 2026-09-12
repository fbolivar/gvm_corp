import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CommercialRequestForm } from '@/features/commercial/components/CommercialRequestForm'
import { Button } from '@/shared/components/ui/button'

export const metadata = { title: 'Nueva solicitud comercial — GVM Corp' }

export default async function NewCommercialPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [partiesRes, oppsRes] = await Promise.all([
        supabase.from('parties').select('id, legal_name').order('legal_name').limit(300),
        supabase.from('crm_opportunities').select('id, name')
            .not('stage', 'in', '("CLOSED_WON","CLOSED_LOST")').order('created_at', { ascending: false }).limit(200),
    ])

    return (
        <div className="page-container space-y-6 pb-24 animate-in fade-in duration-500">
            <Button variant="ghost" asChild className="h-9 px-3 rounded-xl text-slate-400 hover:text-slate-900 text-[10px] font-black uppercase tracking-widest gap-2 w-fit">
                <Link href="/commercial"><ArrowLeft className="h-3.5 w-3.5" /> Volver</Link>
            </Button>
            <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Nueva solicitud</h1>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Agrega los conceptos (vuelo, hospedaje, viáticos…) y envíala a aprobación.</p>
            </div>
            <CommercialRequestForm parties={partiesRes.data ?? []} opportunities={oppsRes.data ?? []} />
        </div>
    )
}
