import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveCargo } from '../utils/carnetHelpers';

/**
 * Cargo de un empleado para mostrarlo en documentos (certificados, carnet).
 * En GVM el cargo es el rol asignado (app_roles). Si el empleado no tiene usuario
 * o rol, cae al nombre del tipo de contrato (misma regla que el carnet).
 * Usa admin client porque puede leer el rol de otro usuario (solo devuelve el nombre del rol).
 */
export async function getEmployeeCargo(
    tenantId: string,
    userId: string | null | undefined,
    contractType: string | null | undefined,
    actorId: string,
): Promise<string> {
    if (!userId) return resolveCargo(undefined, contractType);
    const admin = createAdminClient(actorId);
    const { data: ut } = await admin
        .from('user_tenants')
        .select('role_id, role')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .maybeSingle();

    let roleName: string | null | undefined = ut?.role as string | undefined;
    if (ut?.role_id) {
        const { data: role } = await admin.from('app_roles').select('name').eq('id', ut.role_id).maybeSingle();
        if (role?.name) roleName = role.name as string;
    }
    return resolveCargo(roleName, contractType);
}
