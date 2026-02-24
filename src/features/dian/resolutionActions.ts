'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function saveDianResolutionAction(formData: any) {
    const supabase = await createClient();

    // In a real scenario, we would get the tenant_id from the user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch tenant_id (Mock for MVP)
    const { data: ut } = await supabase.from('user_tenants').select('tenant_id').limit(1).single();
    if (!ut) throw new Error("No tenant found");

    const { error } = await supabase
        .from('dian_resolutions')
        .insert({
            tenant_id: ut.tenant_id,
            prefix: formData.prefix,
            from_number: parseInt(formData.from),
            to_number: parseInt(formData.to),
            current_number: parseInt(formData.from),
            resolution_number: formData.resolutionNumber,
            resolution_date: formData.resolutionDate,
            expiry_date: formData.expiryDate,
            technical_key: formData.technicalKey,
            is_active: true
        });

    if (error) throw error;

    revalidatePath('/dian');
    return { success: true };
}
