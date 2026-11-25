'use server';

import { createClient } from '@/lib/supabase/server';
import { canViewModule } from '@/shared/lib/moduleGuard';
import { revalidatePath } from 'next/cache';
import { contactSchema, addressSchema, type ContactInput, type AddressInput } from '../types/directory';

type Result = { success?: boolean; id?: string; error?: string };

/** Sesión + permiso de módulo CRM + tenant. */
async function ctx() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' as const };
    if (!(await canViewModule('crm'))) return { error: 'Sin permiso para el CRM' as const };
    const { data: tenantId } = await supabase.rpc('get_my_tenant_id');
    if (!tenantId) return { error: 'No se pudo determinar la empresa' as const };
    return { supabase, userId: user.id, tenantId: tenantId as string };
}

/** Confirma que el cliente (party) pertenece al tenant (RLS del cliente de sesión). */
async function assertParty(supabase: Awaited<ReturnType<typeof createClient>>, partyId: string): Promise<boolean> {
    const { data } = await supabase.from('parties').select('id').eq('id', partyId).maybeSingle();
    return !!data;
}

// ─── Contactos ──────────────────────────────────────────────────────────────

export async function createContactAction(input: ContactInput): Promise<Result> {
    const c = await ctx();
    if ('error' in c) return { error: c.error };
    const parsed = contactSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
    if (!(await assertParty(c.supabase, parsed.data.party_id))) return { error: 'Cliente no encontrado' };

    const { data, error } = await c.supabase.from('party_contacts').insert({
        tenant_id: c.tenantId,
        party_id: parsed.data.party_id,
        name: parsed.data.name,
        role: parsed.data.role ?? null,
        phone: parsed.data.phone ?? null,
        mobile: parsed.data.mobile ?? null,
        email: parsed.data.email ?? null,
        is_primary: parsed.data.is_primary ?? false,
        notes: parsed.data.notes ?? null,
        created_by: c.userId,
    }).select('id').single();
    if (error) return { error: error.message };
    revalidatePath(`/parties/${parsed.data.party_id}`);
    revalidatePath('/crm/directory');
    return { success: true, id: data.id as string };
}

export async function updateContactAction(id: string, input: ContactInput): Promise<Result> {
    const c = await ctx();
    if ('error' in c) return { error: c.error };
    const parsed = contactSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

    const { error } = await c.supabase.from('party_contacts').update({
        name: parsed.data.name,
        role: parsed.data.role ?? null,
        phone: parsed.data.phone ?? null,
        mobile: parsed.data.mobile ?? null,
        email: parsed.data.email ?? null,
        is_primary: parsed.data.is_primary ?? false,
        notes: parsed.data.notes ?? null,
        updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) return { error: error.message };
    revalidatePath(`/parties/${parsed.data.party_id}`);
    revalidatePath('/crm/directory');
    return { success: true };
}

export async function deleteContactAction(id: string, partyId: string): Promise<Result> {
    const c = await ctx();
    if ('error' in c) return { error: c.error };
    const { error } = await c.supabase.from('party_contacts').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath(`/parties/${partyId}`);
    revalidatePath('/crm/directory');
    return { success: true };
}

// ─── Direcciones ────────────────────────────────────────────────────────────

export async function createAddressAction(input: AddressInput): Promise<Result> {
    const c = await ctx();
    if ('error' in c) return { error: c.error };
    const parsed = addressSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
    if (!(await assertParty(c.supabase, parsed.data.party_id))) return { error: 'Cliente no encontrado' };

    const { data, error } = await c.supabase.from('party_addresses').insert({
        tenant_id: c.tenantId,
        party_id: parsed.data.party_id,
        label: parsed.data.label ?? null,
        kind: parsed.data.kind ?? null,
        address: parsed.data.address,
        city: parsed.data.city ?? null,
        phone: parsed.data.phone ?? null,
        notes: parsed.data.notes ?? null,
        is_primary: parsed.data.is_primary ?? false,
        created_by: c.userId,
    }).select('id').single();
    if (error) return { error: error.message };
    revalidatePath(`/parties/${parsed.data.party_id}`);
    return { success: true, id: data.id as string };
}

export async function updateAddressAction(id: string, input: AddressInput): Promise<Result> {
    const c = await ctx();
    if ('error' in c) return { error: c.error };
    const parsed = addressSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

    const { error } = await c.supabase.from('party_addresses').update({
        label: parsed.data.label ?? null,
        kind: parsed.data.kind ?? null,
        address: parsed.data.address,
        city: parsed.data.city ?? null,
        phone: parsed.data.phone ?? null,
        notes: parsed.data.notes ?? null,
        is_primary: parsed.data.is_primary ?? false,
        updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) return { error: error.message };
    revalidatePath(`/parties/${parsed.data.party_id}`);
    return { success: true };
}

export async function deleteAddressAction(id: string, partyId: string): Promise<Result> {
    const c = await ctx();
    if ('error' in c) return { error: c.error };
    const { error } = await c.supabase.from('party_addresses').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath(`/parties/${partyId}`);
    return { success: true };
}
