import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { canViewModule } from '@/shared/lib/moduleGuard';
import { canEvaluate } from './performanceService';

/** Sesión + tenant de quien gestiona evaluaciones (permiso de módulo y can_edit). */
export async function requireEvaluatorContext() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' as const };

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) return { error: 'Tenant no encontrado' as const };

    const allowed = await canViewModule('payroll:performance') && await canEvaluate(supabase, tenant.id, user.id);
    if (!allowed) return { error: 'No tienes permiso para gestionar evaluaciones de desempeño' as const };

    return { supabase, user, tenantId: tenant.id as string };
}
