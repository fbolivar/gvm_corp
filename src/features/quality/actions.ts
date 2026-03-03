'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { qualityService } from './services/qualityService';
import { settingsService } from '@/features/settings/services/settingsService';

/** Registrar una inspección de calidad */
export async function createInspectionAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) throw new Error('Tenant no encontrado');

    const stage               = formData.get('stage') as string;
    const lot_number          = (formData.get('lot_number') as string) || null;
    const inspection_date     = formData.get('inspection_date') as string;
    const quantity_inspected  = parseFloat(formData.get('quantity_inspected') as string);
    const quantity_approved   = parseFloat(formData.get('quantity_approved') as string);
    const quantity_rejected   = parseFloat(formData.get('quantity_rejected') as string);
    const result              = formData.get('result') as string;
    const notes               = (formData.get('notes') as string) || null;

    if (!stage || !inspection_date || !result) throw new Error('Campos requeridos faltantes');
    if (isNaN(quantity_inspected) || quantity_inspected <= 0) throw new Error('Cantidad inspeccionada inválida');
    if (isNaN(quantity_approved)  || quantity_approved < 0)  throw new Error('Cantidad aprobada inválida');
    if (isNaN(quantity_rejected)  || quantity_rejected < 0)  throw new Error('Cantidad rechazada inválida');

    await qualityService.createInspection(supabase, {
        tenant_id: tenant.id,
        stage,
        lot_number,
        quantity_inspected,
        quantity_approved,
        quantity_rejected,
        result,
        inspection_date,
        notes,
        inspector_id: user.id,
    });

    revalidatePath('/quality');
    return { success: true };
}

/** Abrir NCR */
export async function createNcrAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) throw new Error('Tenant no encontrado');

    const description = formData.get('description') as string;
    const severity    = formData.get('severity') as string;
    const root_cause  = (formData.get('root_cause') as string) || null;

    if (!description || description.length < 10) throw new Error('Descripción muy corta (mín. 10 caracteres)');
    if (!severity) throw new Error('Severidad requerida');

    // Generar número secuencial simple (timestamp + random)
    const ncr_number = `${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    await qualityService.createNcr(supabase, {
        tenant_id: tenant.id,
        ncr_number,
        description,
        severity,
        root_cause,
    });

    revalidatePath('/quality');
    return { success: true };
}

/** Cerrar NCR */
export async function closeNcrAction(ncrId: string, corrective_action: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    await qualityService.closeNcr(supabase, ncrId, corrective_action);
    revalidatePath('/quality');
    return { success: true };
}
