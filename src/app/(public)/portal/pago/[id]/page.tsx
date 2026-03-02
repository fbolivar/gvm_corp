import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { Card } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { PaymentClient, type PortalDocument } from './PaymentClient'

export default async function DebtorPortalPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: documentId } = await params
    const supabase = createAdminClient()

    const { data: doc, error } = await supabase
        .from('documents')
        .select(`
            id,
            number,
            total,
            due_date,
            issue_date,
            status,
            party_id,
            tenant_id,
            tenant:tenants(name),
            party:parties(legal_name)
        `)
        .eq('id', documentId)
        .single()

    if (error || !doc) notFound()

    const tenant = Array.isArray(doc.tenant) ? doc.tenant[0] : doc.tenant as { name: string } | null
    const party = Array.isArray(doc.party) ? doc.party[0] : doc.party as { legal_name: string } | null

    // Only allow access if document is payable
    const PAYABLE_STATUSES = ['SENT', 'SIGNED', 'ACCEPTED', 'DRAFT']
    if (!PAYABLE_STATUSES.includes(doc.status)) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8 text-center">
                <Card className="max-w-md border-none bg-slate-900 shadow-2xl rounded-[3rem] p-12">
                    <AlertCircle className="w-20 h-20 text-amber-500 mx-auto mb-8" />
                    <h1 className="text-2xl font-black text-white italic uppercase mb-4 tracking-tighter">
                        Factura no Disponible
                    </h1>
                    <p className="text-slate-400 font-bold mb-10">
                        Esta factura ya fue pagada o anulada.
                    </p>
                    <Button className="w-full h-16 rounded-full bg-white text-black font-black uppercase italic tracking-widest hover:bg-slate-200">
                        Contactar Soporte
                    </Button>
                </Card>
            </div>
        )
    }

    const portalDoc: PortalDocument = {
        id: doc.id,
        number: doc.number as string,
        total: Number(doc.total ?? 0),
        due_date: (doc.due_date ?? doc.issue_date) as string,
        issue_date: doc.issue_date as string,
        status: doc.status as string,
        party_id: doc.party_id as string,
        tenant_id: doc.tenant_id as string,
        tenant_name: tenant?.name ?? null,
        party_name: party?.legal_name ?? null,
    }

    return <PaymentClient document={portalDoc} />
}
