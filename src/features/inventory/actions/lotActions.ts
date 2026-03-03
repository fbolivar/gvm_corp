'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { lotService } from '../services/lotService';
import { settingsService } from '@/features/settings/services/settingsService';

/** Crear un nuevo lote de producto */
export async function createLotAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) throw new Error('Tenant no encontrado');

    const product_id       = formData.get('product_id') as string;
    const warehouse_id     = formData.get('warehouse_id') as string;
    const lot_number       = formData.get('lot_number') as string;
    const batch_code       = (formData.get('batch_code') as string) || undefined;
    const qty_raw          = formData.get('qty') as string;
    const cost_raw         = formData.get('cost') as string;
    const expiration_date  = formData.get('expiration_date') as string;
    const supplier_id      = (formData.get('supplier_id') as string) || undefined;
    const notes            = (formData.get('notes') as string) || undefined;

    if (!product_id)      throw new Error('Debe seleccionar un producto');
    if (!warehouse_id)    throw new Error('Debe seleccionar una bodega');
    if (!lot_number || lot_number.trim().length === 0) throw new Error('El número de lote es requerido');
    if (!expiration_date) throw new Error('La fecha de vencimiento es requerida');

    const qty  = parseFloat(qty_raw);
    const cost = parseFloat(cost_raw);

    if (isNaN(qty) || qty <= 0)   throw new Error('La cantidad debe ser mayor a 0');
    if (isNaN(cost) || cost < 0)  throw new Error('El costo no puede ser negativo');

    await lotService.createLot(supabase, {
        tenant_id: tenant.id,
        product_id,
        warehouse_id,
        lot_number: lot_number.trim(),
        batch_code: batch_code?.trim() || undefined,
        qty,
        cost,
        expiration_date,
        supplier_id: supplier_id || undefined,
        notes: notes?.trim() || undefined,
        status: 'ACTIVE',
    });

    revalidatePath('/inventory/lots');
    return { success: true };
}
