import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { canViewModule } from '@/shared/lib/moduleGuard';
import { bogotaDateString } from '@/features/payroll/utils/bogotaTime';
import { visitService } from './visitService';

/** Contexto común de las páginas del planeador: usuario, empresa, alcance y "hoy" en Bogotá. */
export async function loadVisitPageContext() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    // El layout de /crm ya bloquea sin permiso; se repite aquí para que el
    // contexto no dependa de dónde se monte la página.
    if (!(await canViewModule('crm'))) notFound();

    const { data: tenantId } = await supabase.rpc('get_my_tenant_id');
    const [isManager, { data: profile }] = await Promise.all([
        visitService.canSeeAllVisits(supabase, user.id),
        supabase.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle(),
    ]);
    const userName = (profile?.full_name as string | null) || (profile?.email as string | null) || 'GVM';

    return { supabase, userId: user.id, userName, tenantId: (tenantId as string | null) ?? null, isManager, today: bogotaDateString() };
}
