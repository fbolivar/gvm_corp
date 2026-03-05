import { createClient } from '@/lib/supabase/server';
import { crmService } from '@/features/crm/services/crmService';
import { redirect } from 'next/navigation';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { settingsService } from '@/features/settings/services/settingsService';
import { CRMInsightsDashboard } from '@/features/crm/components/CRMInsightsDashboard';
import { Button } from "@/shared/components/ui/button"
import Link from "next/link"
import { Plus, LayoutDashboard } from "lucide-react"

export default async function CRMDashboard() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [stats, tenant] = await Promise.all([
        crmService.getDashboardStats(supabase),
        settingsService.getTenantInfo(supabase)
    ]);

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Centro de Inteligencia CRM"
                subtitle="Estrategia Comercial & Prospección"
                tenant={tenant}
            />

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
                <Button variant="outline" asChild className="h-9 rounded-xl font-semibold text-xs">
                    <Link href="/crm/pipeline" className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        Pipeline
                    </Link>
                </Button>
                <Button asChild className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs">
                    <Link href="/crm/leads/new" className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Nuevo Lead
                    </Link>
                </Button>
            </div>

            <CRMInsightsDashboard stats={stats} />
        </div>
    );
}
