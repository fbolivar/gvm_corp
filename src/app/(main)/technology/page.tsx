import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { settingsService } from '@/features/settings/services/settingsService';
import { technologyService } from '@/features/technology/services/technologyService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { AssetList } from '@/features/technology/components/AssetList';
import { AssetExportActions } from '@/features/technology/components/AssetExportActions';
import { KPICard } from '@/features/dashboard/components/KPICard';
import { Monitor, CheckCircle2, UserCheck, Wrench, ShieldAlert, AlertTriangle } from 'lucide-react';

export default async function TechnologyPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [tenant, assets, kpis, allMaintenanceSchedules] = await Promise.all([
        settingsService.getTenantInfo(supabase),
        technologyService.getAssets(supabase),
        technologyService.getKPIs(supabase),
        technologyService.getAllMaintenanceSchedules(supabase),
    ]);

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <VisualReportHeader
                    title="Tecnología"
                    subtitle="Gestión de Activos IT — ITIL v4"
                    tenant={tenant}
                />
                <AssetExportActions
                    assets={assets}
                    kpis={{ total: kpis.total, available: kpis.available, assigned: kpis.assigned, inMaintenance: kpis.inMaintenance }}
                    maintenanceSchedules={allMaintenanceSchedules}
                    companyName={tenant?.name || 'Empresa'}
                    companyNit={tenant?.nit || undefined}
                    companyAddress={tenant?.address || undefined}
                    companyPhone={tenant?.phone || undefined}
                    logoUrl={tenant?.logo_url || undefined}
                />
            </div>

            {/* KPIs */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <KPICard
                    variant="primary"
                    title="Total Activos"
                    value={kpis.total}
                    icon={Monitor}
                    description="Inventario completo"
                />
                <KPICard
                    title="Disponibles"
                    value={kpis.available}
                    icon={CheckCircle2}
                    description="Listos para asignar"
                />
                <KPICard
                    title="Asignados"
                    value={kpis.assigned}
                    icon={UserCheck}
                    description="En uso actualmente"
                />
                <KPICard
                    title="Mantenimiento"
                    value={kpis.maintenanceDueSoon}
                    icon={kpis.maintenanceDueSoon > 0 ? AlertTriangle : Wrench}
                    description={kpis.maintenanceDueSoon > 0 ? 'Próximos 30 días' : 'Al día'}
                />
            </div>

            {/* Warranty warning */}
            {kpis.warrantyExpiringSoon > 0 && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-800">
                        <span className="font-bold">{kpis.warrantyExpiringSoon} activo(s)</span> con garantía próxima a vencer en los próximos 30 días.
                    </p>
                </div>
            )}

            {/* Asset List */}
            <AssetList assets={assets} />
        </div>
    );
}
