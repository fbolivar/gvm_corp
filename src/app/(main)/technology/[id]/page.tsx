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

    // Get employees for assignment modal
    const { data: employees } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .eq('status', 'ACTIVE')
        .order('first_name');

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
                employees={employees || []}
                currentAssignment={currentAssignment}
            />
        </div>
    );
}
