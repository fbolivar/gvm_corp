'use server'

import { createClient } from '@/lib/supabase/server';
import { purchaseOrderService } from '../services/purchaseOrderService';
import { purchaseOrderSchema } from '../types';
import { revalidatePath } from 'next/cache';

export async function getNextPONumberAction(): Promise<{ poNumber?: string; error?: string }> {
    const supabase = await createClient();
    try {
        const poNumber = await purchaseOrderService.getNextPONumber(supabase);
        return { poNumber };
    } catch (error: unknown) {
        return { error: (error as Error).message };
    }
}

export async function createPurchaseOrderAction(formData: unknown) {
    const supabase = await createClient();
    const parsed = purchaseOrderSchema.safeParse(formData);
    if (!parsed.success) return { error: 'Datos inválidos: ' + JSON.stringify(parsed.error.format()) };

    try {
        const po = await purchaseOrderService.createOrder(supabase, parsed.data);
        revalidatePath('/purchasing/orders');
        return { success: true, id: po.id };
    } catch (error: unknown) {
        return { error: (error as Error).message };
    }
}

export async function updatePurchaseOrderAction(orderId: string, formData: unknown) {
    const supabase = await createClient();
    const parsed = purchaseOrderSchema.safeParse(formData);
    if (!parsed.success) return { error: 'Datos inválidos: ' + JSON.stringify(parsed.error.format()) };

    try {
        await purchaseOrderService.updateOrder(supabase, orderId, parsed.data);
        revalidatePath('/purchasing/orders');
        revalidatePath(`/purchasing/orders/${orderId}`);
        return { success: true };
    } catch (error: unknown) {
        return { error: (error as Error).message };
    }
}

export async function submitForApprovalAction(orderId: string) {
    const supabase = await createClient();
    try {
        await purchaseOrderService.submitForApproval(supabase, orderId);
        revalidatePath('/purchasing/orders');
        return { success: true };
    } catch (error: unknown) {
        return { error: (error as Error).message };
    }
}

export async function approveOrderAction(orderId: string) {
    const supabase = await createClient();
    try {
        await purchaseOrderService.approveOrder(supabase, orderId);
        revalidatePath('/purchasing/orders');
        return { success: true };
    } catch (error: unknown) {
        return { error: (error as Error).message };
    }
}

export async function rejectOrderAction(orderId: string) {
    const supabase = await createClient();
    try {
        await purchaseOrderService.rejectOrder(supabase, orderId);
        revalidatePath('/purchasing/orders');
        return { success: true };
    } catch (error: unknown) {
        return { error: (error as Error).message };
    }
}

export async function cancelOrderAction(orderId: string) {
    const supabase = await createClient();
    try {
        await purchaseOrderService.cancelOrder(supabase, orderId);
        revalidatePath('/purchasing/orders');
        return { success: true };
    } catch (error: unknown) {
        return { error: (error as Error).message };
    }
}
