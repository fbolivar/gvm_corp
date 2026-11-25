'use server';

import { createClient } from '@/lib/supabase/server';
import { canViewModule } from '@/shared/lib/moduleGuard';
import { revalidatePath } from 'next/cache';
import { kpiSettingsSchema, type KpiSettingsInput } from '../types/kpi';

/** Guarda los umbrales de KPIs. Solo gerencia del CRM (verificado en código y por RLS). */
export async function saveKpiSettingsAction(input: KpiSettingsInput): Promise<{ success?: boolean; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };
    if (!(await canViewModule('crm'))) return { error: 'Sin permiso para el CRM' };

    const { data: isManager } = await supabase.rpc('is_crm_manager');
    if (!isManager) return { error: 'Solo gerencia puede cambiar los umbrales.' };

    const parsed = kpiSettingsSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

    const { data: tenantId } = await supabase.rpc('get_my_tenant_id');
    if (!tenantId) return { error: 'No se pudo determinar la empresa' };

    const { error } = await supabase.from('crm_kpi_settings').upsert({
        tenant_id: tenantId,
        ...parsed.data,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id' });
    if (error) return { error: error.message };

    revalidatePath('/crm/visits/kpis');
    return { success: true };
}
