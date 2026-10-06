'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { kioskService } from '../services/kioskService';
import { resolvePartyRow, resolveEmployeeName, resolveCargo, type PartyRow } from '../utils/carnetHelpers';
import { canViewModule } from '@/shared/lib/moduleGuard';

/**
 * Devuelve el cargo (rol) de cada empleado por user_id. Usa admin client porque
 * necesita leer el rol de OTROS usuarios del tenant (no del que ejecuta). Solo
 * devuelve el nombre del rol — ningún dato sensible.
 */
async function getCargosByUserId(tenantId: string, userIds: string[], actorId: string): Promise<Record<string, string>> {
    const map: Record<string, string> = {};
    if (userIds.length === 0) return map;
    const admin = createAdminClient(actorId);
    const { data: uts } = await admin
        .from('user_tenants')
        .select('user_id, role, role_id')
        .eq('tenant_id', tenantId)
        .in('user_id', userIds);
    if (!uts) return map;

    const roleIds = [...new Set(uts.map(u => u.role_id).filter(Boolean))] as string[];
    const roleNameById: Record<string, string> = {};
    if (roleIds.length > 0) {
        const { data: roles } = await admin.from('app_roles').select('id, name').in('id', roleIds);
        (roles || []).forEach(r => { roleNameById[r.id as string] = r.name as string; });
    }
    for (const u of uts) {
        const name = (u.role_id && roleNameById[u.role_id as string]) || (u.role as string) || '';
        if (u.user_id) map[u.user_id as string] = name;
    }
    return map;
}

export async function createTerminalAction(name: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    if (!(await canViewModule('payroll:terminals'))) throw new Error('No autorizado para gestionar terminales');

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
    if (!(await canViewModule('payroll:terminals'))) throw new Error('No autorizado para gestionar terminales');

    await kioskService.toggleTerminal(supabase, id, isActive);
    revalidatePath('/payroll/terminals');
}

/** Renueva el enlace del terminal: el anterior deja de servir de inmediato. */
export async function rotateTerminalTokenAction(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    if (!(await canViewModule('payroll:terminals'))) throw new Error('No autorizado para gestionar terminales');

    const token = await kioskService.rotateTerminalToken(supabase, id);
    revalidatePath('/payroll/terminals');
    return token;
}

export async function deleteTerminalAction(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    if (!(await canViewModule('payroll:terminals'))) throw new Error('No autorizado para gestionar terminales');

    await kioskService.deleteTerminal(supabase, id);
    revalidatePath('/payroll/terminals');
}

export async function generateEmployeeQrPayloadsAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    if (!(await canViewModule('payroll:employees'))) throw new Error('No autorizado');

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
        .select('id, user_id, contract_type, photo_url, eps_name, arl_name, parties(legal_name, doc_number)')
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

    // Cargo (rol) por empleado, para mostrarlo en el carnet en vez del contrato.
    const allUserIds = employees.map(e => e.user_id).filter(Boolean) as string[];
    const cargoMap = await getCargosByUserId(ut.tenant_id as string, allUserIds, user.id);

    return employees
        .map(emp => {
            const party = resolvePartyRow(emp.parties as unknown as RawParty)
            const name = resolveEmployeeName(party, emp.user_id ? profileMap[emp.user_id] : undefined)
            const contract_type = (emp as { contract_type?: string }).contract_type || ''
            return {
                id: emp.id,
                name,
                doc_number: party?.doc_number || '',
                contract_type,
                cargo: resolveCargo(emp.user_id ? cargoMap[emp.user_id] : undefined, contract_type),
                photo_url: (emp as { photo_url?: string | null }).photo_url ?? null,
                eps_name: (emp as { eps_name?: string | null }).eps_name ?? null,
                arl_name: (emp as { arl_name?: string | null }).arl_name ?? null,
                qrPayload: kioskService.generateQrPayload(emp.id, secret),
            }
        })
        .sort((a, b) => a.name.localeCompare(b.name));
}

/** Genera el carnet QR de UN empleado (para la ficha del empleado). */
export async function getEmployeeCarnetAction(employeeId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    if (!(await canViewModule('payroll:employees'))) throw new Error('No autorizado');

    const secret = process.env.KIOSK_QR_SECRET;
    if (!secret) throw new Error('KIOSK_QR_SECRET no configurado en el servidor');

    const { data: ut } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
    if (!ut) return null;

    const { data: emp } = await supabase
        .from('employees')
        .select('id, user_id, contract_type, photo_url, eps_name, arl_name, parties(legal_name, doc_number)')
        .eq('tenant_id', ut.tenant_id)
        .eq('id', employeeId)
        .maybeSingle();
    if (!emp) return null;

    const party = resolvePartyRow(emp.parties as unknown as PartyRow | PartyRow[] | null);

    let profileName: string | undefined;
    if (!party?.legal_name && emp.user_id) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', emp.user_id)
            .maybeSingle();
        profileName = profile?.full_name ?? undefined;
    }

    const contract_type = (emp as { contract_type?: string }).contract_type || '';
    const cargoMap = emp.user_id
        ? await getCargosByUserId(ut.tenant_id as string, [emp.user_id], user.id)
        : {};

    return {
        id: emp.id,
        name: resolveEmployeeName(party, profileName),
        doc_number: party?.doc_number || '',
        contract_type,
        cargo: resolveCargo(emp.user_id ? cargoMap[emp.user_id] : undefined, contract_type),
        photo_url: (emp as { photo_url?: string | null }).photo_url ?? null,
        eps_name: (emp as { eps_name?: string | null }).eps_name ?? null,
        arl_name: (emp as { arl_name?: string | null }).arl_name ?? null,
        qrPayload: kioskService.generateQrPayload(emp.id, secret),
    };
}

// ─── Foto del carnet (permanente en Storage) ─────────────────────────────────
// Antes las fotos vivían en localStorage del navegador → se perdían al limpiar
// caché o cambiar de equipo. Ahora se suben a Supabase Storage (bucket público
// tenant-assets) y la URL se guarda en employees.photo_url.
const CARNET_BUCKET = 'tenant-assets';

// Resultado uniforme para el cliente. IMPORTANTE: estas acciones NUNCA lanzan
// (throw). En producción Next redacta el mensaje de un Server Action que lanza y
// el cliente recibe el genérico "An error occurred in the Server Components
// render" — que es justo lo que confundía. Devolviendo {ok,error} el usuario ve
// el motivo real y además lo dejamos en los logs del servidor.
type PhotoResult = { ok: true; url?: string } | { ok: false; error: string };

/** Sube la foto (dataURL) del carnet y guarda la URL en el empleado. */
export async function saveEmployeePhotoAction(employeeId: string, dataUrl: string): Promise<PhotoResult> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { ok: false, error: 'Sesión expirada. Vuelve a iniciar sesión.' };
        if (!(await canViewModule('payroll:employees'))) return { ok: false, error: 'No autorizado' };

        const { data: ut } = await supabase
            .from('user_tenants')
            .select('tenant_id')
            .eq('user_id', user.id)
            .maybeSingle();
        if (!ut) return { ok: false, error: 'No se pudo determinar la empresa del usuario.' };

        // dataURL: data:<mime>;base64,<datos>. Aceptamos cualquier imagen; el
        // cliente ya la reduce a JPEG pequeño antes de enviarla.
        const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
        if (!match) return { ok: false, error: 'Formato de imagen no válido.' };
        const contentType = match[1] || 'image/jpeg';
        const buffer = Buffer.from(match[2], 'base64');
        if (buffer.byteLength > 4 * 1024 * 1024) return { ok: false, error: 'La imagen es muy pesada. Usa una más liviana.' };

        const ext = (contentType.split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace('+xml', '');
        const path = `carnet-photos/${ut.tenant_id}/${employeeId}.${ext}`;

        const admin = createAdminClient(user.id);
        const { error: upErr } = await admin.storage
            .from(CARNET_BUCKET)
            .upload(path, buffer, { contentType, upsert: true });
        if (upErr) {
            console.error('[carnet] upload storage falló:', upErr);
            return { ok: false, error: `No se pudo subir la foto: ${upErr.message}` };
        }

        const { data: pub } = admin.storage.from(CARNET_BUCKET).getPublicUrl(path);
        // Cache-buster para que el navegador refresque la imagen al reemplazarla.
        const url = `${pub.publicUrl}?v=${Date.now()}`;

        const { error: updErr } = await admin
            .from('employees')
            .update({ photo_url: url })
            .eq('id', employeeId)
            .eq('tenant_id', ut.tenant_id);
        if (updErr) {
            console.error('[carnet] update employees.photo_url falló:', updErr);
            return { ok: false, error: `No se pudo guardar la foto: ${updErr.message}` };
        }

        // Sin revalidatePath: al invocarse desde /payroll/employees/[id], revalidar la
        // ruta actual fuerza un re-render de sus Server Components y podría fallar. El
        // cliente ya actualiza la imagen de forma optimista con la URL devuelta.
        return { ok: true, url };
    } catch (e) {
        console.error('[carnet] saveEmployeePhotoAction excepción:', e);
        return { ok: false, error: e instanceof Error ? e.message : 'Error inesperado al guardar la foto.' };
    }
}

/** Quita la foto del carnet del empleado. */
export async function removeEmployeePhotoAction(employeeId: string): Promise<PhotoResult> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { ok: false, error: 'Sesión expirada. Vuelve a iniciar sesión.' };
        if (!(await canViewModule('payroll:employees'))) return { ok: false, error: 'No autorizado' };

        const { data: ut } = await supabase
            .from('user_tenants')
            .select('tenant_id')
            .eq('user_id', user.id)
            .maybeSingle();
        if (!ut) return { ok: false, error: 'No se pudo determinar la empresa del usuario.' };

        const admin = createAdminClient(user.id);
        const { error: updErr } = await admin
            .from('employees')
            .update({ photo_url: null })
            .eq('id', employeeId)
            .eq('tenant_id', ut.tenant_id);
        if (updErr) {
            console.error('[carnet] remove update falló:', updErr);
            return { ok: false, error: `No se pudo quitar la foto: ${updErr.message}` };
        }

        // Borrado best-effort del objeto en Storage (varias extensiones posibles).
        await admin.storage.from(CARNET_BUCKET).remove([
            `carnet-photos/${ut.tenant_id}/${employeeId}.jpg`,
            `carnet-photos/${ut.tenant_id}/${employeeId}.png`,
            `carnet-photos/${ut.tenant_id}/${employeeId}.webp`,
        ]);

        return { ok: true };
    } catch (e) {
        console.error('[carnet] removeEmployeePhotoAction excepción:', e);
        return { ok: false, error: e instanceof Error ? e.message : 'Error inesperado al quitar la foto.' };
    }
}
