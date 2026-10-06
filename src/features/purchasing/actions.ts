"use server"

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { documentService } from '@/features/documents/services/documentService';
import { documentSchema, missingCatalogProductLines, Document, DocumentType } from '@/features/documents/types';
import { purchasingService } from './services/purchasingService';
import { purchaseOrderService } from './services/purchaseOrderService';

export async function createPurchasingDocumentAction(data: Document, redirectPath: string) {
    const supabase = await createClient();

    const parsed = documentSchema.safeParse(data);
    if (!parsed.success) {
        return { error: "Datos inválidos" };
    }

    // Solo al CREAR: hoy no aplica a ningún doc_type de compras (Andrés solo
    // confirmó Factura/Nota Crédito de ventas), queda listo para cuando compras
    // tenga su propio doc_type con contabilidad completa.
    const missing = missingCatalogProductLines(parsed.data);
    if (missing.length > 0) {
        return { error: `Este tipo de documento exige producto del catálogo en cada línea (falta en el ítem ${missing.map(i => i + 1).join(', ')}).` };
    }

    try {
        await documentService.createDocument(supabase, parsed.data as any);
    } catch (error: any) {
        return { error: error.message };
    }

    revalidatePath(redirectPath);
    redirect(redirectPath);
}

export async function convertPurchasingDocumentAction(sourceId: string, targetType: DocumentType) {
    const supabase = await createClient();

    let newDocId: string;
    try {
        newDocId = await purchasingService.convertDocument(supabase, sourceId, targetType);
    } catch (error: any) {
        return { error: error.message };
    }

    const listPath = targetType === 'PURCHASE_ORDER' ? '/purchasing/orders' : '/purchasing/bills';
    revalidatePath(listPath);
    redirect(`/documents/${newDocId}`);
}
export async function markAsReceivedAction(docId: string) {
    const supabase = await createClient();
    try {
        await purchasingService.markAsReceived(supabase, docId);
        revalidatePath('/purchasing/orders');
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function approveVendorBillAction(docId: string) {
    const supabase = await createClient();
    try {
        await purchasingService.approveVendorBill(supabase, docId);
        revalidatePath('/purchasing/bills');
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function submitOrderForApprovalAction(docId: string) {
    const supabase = await createClient();
    try {
        await purchaseOrderService.submitForApproval(supabase, docId);
        revalidatePath('/purchasing/orders');
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function approveOrderAction(docId: string) {
    const supabase = await createClient();
    try {
        await purchaseOrderService.approveOrder(supabase, docId);
        revalidatePath('/purchasing/orders');
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function cancelOrderAction(docId: string) {
    const supabase = await createClient();
    try {
        await purchaseOrderService.cancelOrder(supabase, docId);
        revalidatePath('/purchasing/orders');
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}
