import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { settingsService } from '@/features/settings/services/settingsService';
import { technologyService } from '@/features/technology/services/technologyService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { AssetDetailClient } from '@/features/technology/components/AssetDetailClient';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [tenant, asset] = await Promise.all([
        settingsService.getTenantInfo(supabase),
        technologyService.getAssetById(supabase, id),
    ]);

    if (!asset) notFound();

    const [assignments, maintenanceSchedules, currentAssignment] = await Promise.all([
        technologyService.getAssignments(supabase, id),
        technologyService.getMaintenanceSchedules(supabase, id),
        technologyService.getCurrentAssignment(supabase, id),
    ]);

    // Get employees for assignment modal (name from parties or profiles fallback)
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
                title={asset.name}
                subtitle={`${asset.asset_code} — Detalle del Activo`}
                tenant={tenant}
            />
            <AssetDetailClient
                asset={asset}
                assignments={assignments}
                maintenanceSchedules={maintenanceSchedules}
                employees={employees}
                currentAssignment={currentAssignment}
            />
        </div>
    );
}
