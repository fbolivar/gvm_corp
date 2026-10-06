'use server';

import { createClient } from '@/lib/supabase/server';
import type { TenantLicense } from '../services/licenseService';

/**
 * Trae la licencia del tenant resolviendo la sesión del lado del SERVIDOR
 * (cookies), no con el cliente del navegador.
 *
 * Antes esta consulta se hacía desde el navegador (`licenseService.getLicense`,
 * cliente `@supabase/ssr` browser). Ese cliente inicializa la sesión de forma
 * asíncrona (lee cookies, refresca el token) y si el componente dispara la
 * consulta ANTES de que termine, corre como `anon`: la RLS de `tenant_licenses`
 * ("tenant_id = get_my_tenant_id()") no encuentra nada y el banner muestra
 * "No se encontró licencia activa" con la licencia perfectamente vigente. En un
 * PC rápido la carrera casi nunca se pierde; en una tablet más lenta, sí — de
 * ahí que el mismo usuario no viera el aviso en un equipo y sí en el otro.
 */
export async function getLicenseAction(): Promise<TenantLicense | null> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('tenant_licenses')
        .select('*')
        .limit(1)
        .maybeSingle();
    return data as TenantLicense | null;
}
