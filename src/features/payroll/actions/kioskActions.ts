'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { kioskService } from '../services/kioskService';
import { resolvePartyRow, resolveEmployeeName, type PartyRow } from '../utils/carnetHelpers';

export async function createTerminalAction(name: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data: ut } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
    if (!ut) throw new Error('Sin tenant');

    const terminal = await kioskService.createTerminal(supabase, ut.tenant_id, name);
    revalidatePath('/payroll/terminals');
    return terminal;
}

export async function toggleTerminalAction(id: string, isActive: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    await kioskService.toggleTerminal(supabase, id, isActive);
    revalidatePath('/payroll/terminals');
}

export async function deleteTerminalAction(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    await kioskService.deleteTerminal(supabase, id);
    revalidatePath('/payroll/terminals');
}

export async function generateEmployeeQrPayloadsAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const secret = process.env.KIOSK_QR_SECRET;
    if (!secret) throw new Error('KIOSK_QR_SECRET no configurado en el servidor');

    // Obtener tenant del usuario
    const { data: ut } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
    if (!ut) return [];

    // Empleados activos con join a parties
    const { data: employees } = await supabase
        .from('employees')
        .select('id, user_id, contract_type, parties(legal_name, doc_number)')
        .eq('tenant_id', ut.tenant_id)
        .eq('status', 'ACTIVE');

    if (!employees || employees.length === 0) return [];

    type RawParty = PartyRow | PartyRow[] | null

    // Para empleados sin party, buscar nombre en profiles
    const noPartyUserIds = employees
        .filter(e => !resolvePartyRow(e.parties as unknown as RawParty)?.legal_name)
        .map(e => e.user_id)
        .filter(Boolean) as string[];

    const profileMap: Record<string, string> = {};
    if (noPartyUserIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', noPartyUserIds);
        if (profiles) {
            profiles.forEach(p => { profileMap[p.id] = p.full_name || '' });
        }
    }

    return employees
        .map(emp => {
            const party = resolvePartyRow(emp.parties as unknown as RawParty)
            const name = resolveEmployeeName(party, emp.user_id ? profileMap[emp.user_id] : undefined)
            return {
                id: emp.id,
                name,
                doc_number: party?.doc_number || '',
                contract_type: (emp as { contract_type?: string }).contract_type || '',
                qrPayload: kioskService.generateQrPayload(emp.id, secret),
            }
        })
        .sort((a, b) => a.name.localeCompare(b.name));
}
