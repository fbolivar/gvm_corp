"use client"

import { LeadForm } from '@/features/crm/components/LeadForm';
import { updateLeadAction } from '@/features/crm/actions';
import { Lead } from '@/features/crm/types';
import { toast } from 'sonner';

interface Props {
    lead: Lead;
}

export function EditLeadClient({ lead }: Props) {
    const handleSubmit = async (data: Lead) => {
        const result = await updateLeadAction(lead.id!, data);
        if (result?.error) {
            toast.error(`Error: ${result.error}`);
        }
    };

    return <LeadForm initialData={lead} onSubmit={handleSubmit} />;
}
