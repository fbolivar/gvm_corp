import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { AssetForm } from '@/features/technology/components/AssetForm';

export default async function NewAssetPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const tenant = await settingsService.getTenantInfo(supabase);

    // Fetch active employees for assignment selector (name from parties or profiles fallback)
    const { data: empRows } = await supabase.rpc('execute_sql_internal', {
        query: `
            SELECT e.id,
                   COALESCE(p.legal_name, pr.full_name, 'Sin nombre') AS display_name
            FROM employees e
            LEFT JOIN parties  p  ON p.id  = e.party_id
            LEFT JOIN profiles pr ON pr.id = e.user_id
            WHERE e.tenant_id = get_my_tenant_id()
              AND e.status = 'ACTIVE'
            ORDER BY display_name
        `
    });

    const employees = ((empRows as { id: string; display_name: string }[]) || []).map(e => ({
        id: e.id,
        party: { legal_name: e.display_name },
    }));

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Nuevo Activo"
                subtitle="Registro de equipo tecnologico"
                tenant={tenant}
            />
            <AssetForm employees={employees} />
        </div>
    );
}
