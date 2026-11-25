import { createClient } from '@/lib/supabase/server';
import { AuditTrail } from '@/shared/components/ui/audit-trail';
import { partyService } from '@/features/parties/services/partyService';
import { directoryService } from '@/features/crm/services/directoryService';
import { PartyContactsPanel } from '@/features/crm/components/PartyContactsPanel';
import { PartyAddressesPanel } from '@/features/crm/components/PartyAddressesPanel';
import EditPartyClient from './client';
import { notFound } from 'next/navigation';

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditPartyPage({ params }: PageProps) {
    const supabase = await createClient();
    const { id } = await params;

    try {
        const party = await partyService.getPartyById(supabase, id);
        if (!party) notFound();

        // ¿Este tercero también es empleado? (rol múltiple)
        const { data: employeeLink } = await supabase
            .from('employees')
            .select('id')
            .eq('party_id', id)
            .maybeSingle();

        // Fetch price lists
        const { data: priceLists } = await supabase
            .from('price_lists')
            .select('id, name')
            .order('name');

        // Fetch team members as salespeople
        const { data: salespeople } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .order('full_name');

        // Directorio comercial del cliente: contactos y direcciones.
        const [contacts, addresses] = await Promise.all([
            directoryService.listContacts(supabase, id),
            directoryService.listAddresses(supabase, id),
        ]);

        return (
            <div className="pb-20">
                <EditPartyClient
                    party={party}
                    priceLists={priceLists || []}
                    salespeople={salespeople || []}
                    employeeId={employeeLink?.id ?? null}
                />
                <div className="page-container mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <PartyContactsPanel partyId={id} initial={contacts} />
                    <PartyAddressesPanel partyId={id} initial={addresses} />
                </div>
                <div className="mt-8">
                    <AuditTrail
                        client={supabase}
                        entity="parties"
                        entityId={id}
                    />
                </div>
            </div>
        );
    } catch (e) {
        notFound();
    }
}
