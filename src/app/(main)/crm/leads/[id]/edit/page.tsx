import { createClient } from '@/lib/supabase/server';
import { crmService } from '@/features/crm/services/crmService';
import { redirect, notFound } from 'next/navigation';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { settingsService } from '@/features/settings/services/settingsService';
import { EditLeadClient } from './EditLeadClient';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function EditLeadPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    let lead;
    try {
        lead = await crmService.getLeadById(supabase, id);
    } catch {
        notFound();
    }

    const tenant = await settingsService.getTenantInfo(supabase);

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Editar Prospecto"
                subtitle="CRM — Modificar datos del lead"
                tenant={tenant}
            />
            <EditLeadClient lead={lead} />
        </div>
    );
}
