import { SupabaseClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';
import { KioskTerminal } from '../types';

export interface ParsedQrCode {
    employeeId: string;
    hmacSignature: string;
}

export const kioskService = {
    /**
     * Genera el payload QR para un empleado (server-side only).
     * Formato: gvm:{employeeId}:{hmac_hex}
     */
    generateQrPayload(employeeId: string, secret: string): string {
        const hmac = createHmac('sha256', secret).update(employeeId).digest('hex').slice(0, 16);
        return `gvm:${employeeId}:${hmac}`;
    },

    /**
     * Verifica la firma HMAC de un QR escaneado (server-side only).
     */
    verifyQrSignature(employeeId: string, signature: string, secret: string): boolean {
        const expected = createHmac('sha256', secret).update(employeeId).digest('hex').slice(0, 16);
        return expected === signature;
    },

    /**
     * Parsea el payload de un QR escaneado (client-side safe).
     * Retorna null si el formato es invalido.
     */
    parseQrPayload(raw: string): ParsedQrCode | null {
        if (!raw.startsWith('gvm:')) return null;
        const parts = raw.split(':');
        if (parts.length !== 3) return null;
        const employeeId = parts[1];
        const hmacSignature = parts[2];
        if (!employeeId || !hmacSignature) return null;
        return { employeeId, hmacSignature };
    },

    // ─── CRUD TERMINALES ────────────────────────────────────────────────────────

    async getTerminals(client: SupabaseClient): Promise<KioskTerminal[]> {
        const { data, error } = await client
            .from('kiosk_terminals')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []) as KioskTerminal[];
    },

    async createTerminal(client: SupabaseClient, tenantId: string, name: string): Promise<KioskTerminal> {
        const { data, error } = await client
            .from('kiosk_terminals')
            .insert({ tenant_id: tenantId, name })
            .select()
            .single();

        if (error) throw error;
        return data as KioskTerminal;
    },

    async toggleTerminal(client: SupabaseClient, id: string, isActive: boolean): Promise<void> {
        const { error } = await client
            .from('kiosk_terminals')
            .update({ is_active: isActive })
            .eq('id', id);

        if (error) throw error;
    },

    async deleteTerminal(client: SupabaseClient, id: string): Promise<void> {
        const { error } = await client
            .from('kiosk_terminals')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },
};
