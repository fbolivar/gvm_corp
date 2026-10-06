import { SupabaseClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';
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
        // Comparación en tiempo constante: `===` termina en el primer carácter
        // distinto y filtra información por tiempo de respuesta.
        const a = Buffer.from(expected, 'utf8');
        const b = Buffer.from(String(signature), 'utf8');
        return a.length === b.length && timingSafeEqual(a, b);
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

    /**
     * Genera un enlace nuevo para el terminal e invalida el anterior.
     *
     * Es la respuesta cuando el enlace se filtra (alguien fotografía la URL o la
     * comparte): el token viejo deja de funcionar al instante y el historial de
     * marcaciones del terminal se conserva, cosa que no ocurriría borrándolo y
     * creándolo de nuevo.
     */
    async rotateTerminalToken(client: SupabaseClient, id: string): Promise<string> {
        // Dos UUID v4 concatenados sin guiones: el mismo formato que genera la
        // base al crear el terminal (64 caracteres hexadecimales).
        const newToken = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '');

        const { data, error } = await client
            .from('kiosk_terminals')
            .update({ token: newToken })
            .eq('id', id)
            .select('token')
            .single();

        if (error) throw error;
        return data.token as string;
    },

    async deleteTerminal(client: SupabaseClient, id: string): Promise<void> {
        const { error } = await client
            .from('kiosk_terminals')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },
};
