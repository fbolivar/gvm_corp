'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { kioskService } from '../services/kioskService';

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

    const { data: employees } = await supabase
        .from('employees')
        .select('id, party:parties(legal_name, doc_number), status')
        .eq('status', 'ACTIVE');

    if (!employees) return [];

    return employees.map(emp => {
        const party = emp.party as unknown as { legal_name: string; doc_number: string } | { legal_name: string; doc_number: string }[] | null;
        const p = Array.isArray(party) ? party[0] : party;

        return {
            id: emp.id,
            name: p?.legal_name || 'Sin nombre',
            doc_number: p?.doc_number || '',
            qrPayload: kioskService.generateQrPayload(emp.id, secret),
        };
    });
}
