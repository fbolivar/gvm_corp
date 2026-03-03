'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { maintenanceService } from './services/maintenanceService';
import { settingsService } from '@/features/settings/services/settingsService';

/** Registrar un nuevo equipo */
export async function createEquipmentAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) throw new Error('Tenant no encontrado');

    const code               = formData.get('code') as string;
    const name               = formData.get('name') as string;
    const brand              = (formData.get('brand') as string) || null;
    const model              = (formData.get('model') as string) || null;
    const serial_number      = (formData.get('serial_number') as string) || null;
    const location           = (formData.get('location') as string) || null;
    const purchase_date      = (formData.get('purchase_date') as string) || null;
    const next_maintenance_date = (formData.get('next_maintenance_date') as string) || null;
    const notes              = (formData.get('notes') as string) || null;

    if (!code || code.trim().length === 0) throw new Error('El código del equipo es requerido');
    if (!name || name.trim().length === 0) throw new Error('El nombre del equipo es requerido');

    await maintenanceService.createEquipment(supabase, {
        tenant_id: tenant.id,
        code: code.trim(),
        name: name.trim(),
        brand,
        model,
        serial_number,
        location,
        purchase_date: purchase_date || null,
        next_maintenance_date: next_maintenance_date || null,
        notes,
        status: 'ACTIVE',
    });

    revalidatePath('/maintenance');
    return { success: true };
}

/** Crear una orden de mantenimiento */
export async function createMaintenanceOrderAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) throw new Error('Tenant no encontrado');

    const equipment_id      = formData.get('equipment_id') as string;
    const order_type        = formData.get('order_type') as string;
    const priority          = formData.get('priority') as string;
    const description       = formData.get('description') as string;
    const technician_name   = (formData.get('technician_name') as string) || null;
    const scheduled_date    = formData.get('scheduled_date') as string;
    const estimated_cost_raw = formData.get('estimated_cost') as string;
    const estimated_cost    = estimated_cost_raw ? parseFloat(estimated_cost_raw) : null;

    if (!equipment_id) throw new Error('Debe seleccionar un equipo');
    if (!order_type) throw new Error('El tipo de orden es requerido');
    if (!priority) throw new Error('La prioridad es requerida');
    if (!description || description.trim().length < 5) throw new Error('La descripción debe tener al menos 5 caracteres');
    if (!scheduled_date) throw new Error('La fecha programada es requerida');
    if (estimated_cost !== null && isNaN(estimated_cost)) throw new Error('Costo estimado inválido');

    await maintenanceService.createOrder(supabase, {
        tenant_id: tenant.id,
        equipment_id,
        order_type,
        priority,
        description: description.trim(),
        technician_name,
        scheduled_date,
        estimated_cost,
    });

    revalidatePath('/maintenance');
    return { success: true };
}

/** Actualizar estado de una orden de mantenimiento */
export async function updateOrderStatusAction(
    orderId: string,
    status: string,
    actual_cost?: number,
    notes?: string,
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    if (!orderId) throw new Error('ID de orden requerido');
    if (!status) throw new Error('Estado requerido');

    await maintenanceService.updateOrderStatus(supabase, orderId, status, actual_cost, notes);

    revalidatePath('/maintenance');
    return { success: true };
}
