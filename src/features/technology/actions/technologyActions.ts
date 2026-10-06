'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { settingsService } from '@/features/settings/services/settingsService';
import { technologyService } from '../services/technologyService';
import { createAssetSchema, assignAssetSchema, returnAssetSchema, createMaintenanceSchema } from '../types';

export async function createAssetAction(formData: FormData): Promise<{ success: true; id: string } | { error: string }> {
    // Devuelve el error en vez de lanzarlo: en producción Next reemplaza los
    // errores lanzados por una Server Action con un mensaje genérico
    // ("An error occurred in the Server Components render…") y el usuario no
    // sabe qué corregir.
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: 'Sesión expirada. Vuelve a iniciar sesión.' };

        const tenant = await settingsService.getTenantInfo(supabase);
        if (!tenant) return { error: 'Tu usuario no está vinculado a una empresa. Pide al administrador que revise tu acceso.' };

        // formData.get devuelve null si el campo no viene; Zod .optional() no acepta null.
        const str = (k: string) => { const v = formData.get(k); return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined; };

        // Parse specs from formData keys like specs_ram, specs_storage, etc.
        const specs: Record<string, string> = {};
        for (const [key, value] of formData.entries()) {
            if (key.startsWith('specs_') && typeof value === 'string' && value.trim()) {
                specs[key.replace('specs_', '')] = value.trim();
            }
        }

        const parsed = createAssetSchema.safeParse({
            name: str('name') ?? '',
            category: str('category'),
            brand: str('brand'),
            model: str('model'),
            serial_number: str('serial_number'),
            purchase_date: str('purchase_date'),
            purchase_cost: str('purchase_cost') ? Number(str('purchase_cost')) : 0,
            warranty_expiry: str('warranty_expiry'),
            condition: str('condition') ?? 'NEW',
            notes: str('notes'),
            specs,
        });

        if (!parsed.success) {
            const i = parsed.error.issues[0];
            const field = String(i?.path?.[0] ?? '');
            return { error: field === 'category' ? 'Elige la categoría del activo.' : `${field ? field + ': ' : ''}${i?.message ?? 'Datos inválidos'}` };
        }

        const asset = await technologyService.createAsset(supabase, {
            tenant_id: tenant.id,
            name: parsed.data.name,
            category: parsed.data.category,
            brand: parsed.data.brand,
            model: parsed.data.model,
            serial_number: parsed.data.serial_number,
            purchase_date: parsed.data.purchase_date,
            purchase_cost: parsed.data.purchase_cost,
            warranty_expiry: parsed.data.warranty_expiry,
            condition: parsed.data.condition,
            specs: parsed.data.specs as Record<string, string>,
            notes: parsed.data.notes,
        });

        // If employee_id provided, assign asset immediately
        const employeeId = str('employee_id');
        if (employeeId) {
            await technologyService.assignAsset(supabase, {
                tenant_id: tenant.id,
                asset_id: asset.id,
                employee_id: employeeId,
                assigned_by: user.id,
            });
        }

        revalidatePath('/technology');
        return { success: true, id: asset.id };
    } catch (e) {
        const err = e as { code?: string; message?: string };
        console.error('[technology] createAssetAction:', err?.code, err?.message);
        if (err?.code === '23505' && String(err.message).includes('serial_number')) {
            return { error: 'Ya existe un activo registrado con ese número de serie. Revisa el listado o cambia el serial.' };
        }
        return { error: err?.message || 'No se pudo registrar el activo' };
    }
}

export async function updateAssetAction(id: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const updates: Record<string, unknown> = {};
    const fields = ['name', 'category', 'brand', 'model', 'serial_number', 'purchase_date', 'warranty_expiry', 'condition', 'status', 'notes'];
    for (const f of fields) {
        const val = formData.get(f);
        if (val !== null) updates[f] = val || null;
    }
    const cost = formData.get('purchase_cost');
    if (cost !== null) updates.purchase_cost = Number(cost) || 0;

    await technologyService.updateAsset(supabase, id, updates);
    revalidatePath('/technology');
    revalidatePath(`/technology/${id}`);
}

export async function deleteAssetAction(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const asset = await technologyService.getAssetById(supabase, id);
    if (!asset) return { success: false, error: 'Activo no encontrado' };

    // Se permite eliminar aunque esté asignado (p. ej. para borrar duplicados).
    // Las asignaciones y mantenimientos asociados se borran en cascada (FK ON DELETE CASCADE).
    try {
        await technologyService.deleteAsset(supabase, id);
        revalidatePath('/technology');
        return { success: true };
    } catch (e) {
        const message = e instanceof Error ? e.message : 'No se pudo eliminar el activo';
        console.error('[deleteAssetAction]', e);
        return { success: false, error: message };
    }
}

export async function assignAssetAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) throw new Error('Tenant no encontrado');

    const parsed = assignAssetSchema.safeParse({
        asset_id: formData.get('asset_id'),
        employee_id: formData.get('employee_id'),
        delivery_notes: formData.get('delivery_notes'),
    });

    if (!parsed.success) throw new Error(parsed.error.issues[0].message);

    await technologyService.assignAsset(supabase, {
        tenant_id: tenant.id,
        asset_id: parsed.data.asset_id,
        employee_id: parsed.data.employee_id,
        assigned_by: user.id,
        delivery_notes: parsed.data.delivery_notes,
    });

    revalidatePath('/technology');
    revalidatePath(`/technology/${parsed.data.asset_id}`);
}

export async function returnAssetAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const parsed = returnAssetSchema.safeParse({
        assignment_id: formData.get('assignment_id'),
        return_condition: formData.get('return_condition'),
        return_notes: formData.get('return_notes'),
    });

    if (!parsed.success) throw new Error(parsed.error.issues[0].message);

    await technologyService.returnAsset(supabase, parsed.data.assignment_id, {
        return_condition: parsed.data.return_condition,
        return_notes: parsed.data.return_notes,
    });

    const assetId = formData.get('asset_id') as string;
    revalidatePath('/technology');
    if (assetId) revalidatePath(`/technology/${assetId}`);
}

export async function createMaintenanceAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) throw new Error('Tenant no encontrado');

    const parsed = createMaintenanceSchema.safeParse({
        asset_id: formData.get('asset_id'),
        maintenance_type: formData.get('maintenance_type'),
        frequency_days: formData.get('frequency_days'),
        next_due_at: formData.get('next_due_at'),
        notes: formData.get('notes'),
    });

    if (!parsed.success) throw new Error(parsed.error.issues[0].message);

    await technologyService.createMaintenance(supabase, {
        tenant_id: tenant.id,
        ...parsed.data,
    });

    revalidatePath(`/technology/${parsed.data.asset_id}`);
}

export async function completeMaintenanceAction(id: string, performedBy: string, assetId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    await technologyService.completeMaintenance(supabase, id, performedBy);
    revalidatePath(`/technology/${assetId}`);
}
