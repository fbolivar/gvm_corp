'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { settingsService } from '@/features/settings/services/settingsService';
import { technologyService } from '../services/technologyService';
import { createAssetSchema, assignAssetSchema, returnAssetSchema, createMaintenanceSchema } from '../types';

export async function createAssetAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) throw new Error('Tenant no encontrado');

    const raw = {
        name: formData.get('name') as string,
        category: formData.get('category') as string,
        brand: formData.get('brand') as string,
        model: formData.get('model') as string,
        serial_number: formData.get('serial_number') as string,
        purchase_date: formData.get('purchase_date') as string,
        purchase_cost: formData.get('purchase_cost') as string,
        warranty_expiry: formData.get('warranty_expiry') as string,
        condition: formData.get('condition') as string,
        notes: formData.get('notes') as string,
    };

    // Parse specs from formData keys like specs_ram, specs_storage, etc.
    const specs: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
        if (key.startsWith('specs_') && typeof value === 'string' && value.trim()) {
            specs[key.replace('specs_', '')] = value.trim();
        }
    }

    const parsed = createAssetSchema.safeParse({
        ...raw,
        purchase_cost: raw.purchase_cost ? Number(raw.purchase_cost) : 0,
        specs,
    });

    if (!parsed.success) {
        throw new Error(parsed.error.issues[0].message);
    }

    await technologyService.createAsset(supabase, {
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

    revalidatePath('/technology');
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
