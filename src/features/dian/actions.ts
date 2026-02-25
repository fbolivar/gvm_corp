'use server';

import { createClient } from '@/lib/supabase/server';
import { dianService } from './services/dianService';
import { providerIntegrationService } from './services/providerIntegrationService';
import { revalidatePath } from 'next/cache';

export async function emitDianAction(documentId: string) {
    const supabase = await createClient();
    try {
        // Enlaza el nuevo servicio de simulación de Proveedor Tecnológico (JSON Payload) en lugar del viejo constructor XML local.
        const result = await providerIntegrationService.sendToProvider(supabase, documentId);
        revalidatePath('/documents');
        revalidatePath('/dian');
        return result;
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function getDianConfigAction() {
    const supabase = await createClient();
    try {
        return await dianService.getConfig(supabase);
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function saveDianConfigAction(config: any) {
    const supabase = await createClient();
    try {
        const result = await dianService.saveConfig(supabase, config);
        revalidatePath('/dian');
        return result;
    } catch (error: any) {
        return { error: error.message };
    }
}
