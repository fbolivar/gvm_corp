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
        revalidatePath('/sales/invoices');
        revalidatePath('/accounting/cartera');
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

// ─── getPayrollXmlAction ──────────────────────────────────────────────────────
// Returns the stored xml_content for an electronic_document, or regenerates it.

export async function getPayrollXmlAction(
    electronicDocId: string
): Promise<{ xml: string; filename: string } | { error: string }> {
    const supabase = await createClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: 'No autenticado' };

        const { data: elec, error } = await supabase
            .from('electronic_documents')
            .select('xml_content, cufe, document:documents(number, doc_type)')
            .eq('id', electronicDocId)
            .single();

        if (error || !elec) return { error: 'Documento no encontrado' };

        const doc = Array.isArray(elec.document) ? elec.document[0] : elec.document as { number: string; doc_type: string } | null;

        if (!doc || doc.doc_type !== 'PAYROLL') {
            return { error: 'No es un documento de nómina' };
        }

        const xml = elec.xml_content ?? '<!-- XML no disponible para este documento -->';
        const filename = `NominaElectronica_${doc.number ?? electronicDocId}.xml`;

        return { xml, filename };
    } catch (err: unknown) {
        return { error: String(err) };
    }
}
