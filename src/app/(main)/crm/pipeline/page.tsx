import { createClient } from "@/lib/supabase/server"
import { crmService } from "@/features/crm/services/crmService"
import { PipelineViewManager } from "@/features/crm/components/PipelineViewManager"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Plus, Target, TrendingUp, Activity } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader'
import { settingsService } from "@/features/settings/services/settingsService"

export default async function PipelinePage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [opportunities, tenant] = await Promise.all([
        crmService.getOpportunities(supabase),
        settingsService.getTenantInfo(supabase)
    ]);

    const totalPipelineValue = opportunities.reduce((acc: number, curr: Record<string, unknown>) => acc + (Number(curr.value) || 0), 0);
    const winRate = opportunities.length > 0 ? (opportunities.filter((o: Record<string, unknown>) => o.stage === 'CLOSED_WON').length / opportunities.length) * 100 : 0;

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Pipeline Comercial"
                subtitle="CRM — Monitoreo de Oportunidades"
                tenant={tenant}
            />

            {/* Action button */}
            <div className="flex flex-wrap gap-3">
                <Button asChild className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs">
                    <Link href="/crm/opportunities/new" className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Nueva Oportunidad
                    </Link>
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl">
                    <CardContent className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Target className="h-5 w-5" />
                            </div>
                            <Badge className="bg-slate-900 text-white border-none font-semibold text-[10px] tracking-wider px-2 py-0.5 rounded-full">Nominal</Badge>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Capital en Pipeline</p>
                            <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalPipelineValue)}
                            </h3>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full w-full bg-indigo-500 rounded-full" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl">
                    <CardContent className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-semibold text-[10px] tracking-wider px-2 py-0.5 rounded-full">Win Rate</Badge>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Tasa de Exito</p>
                            <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">{winRate.toFixed(1)}%</h3>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full w-2/3 bg-emerald-500 rounded-full" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl">
                    <CardContent className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                                <Activity className="h-5 w-5" />
                            </div>
                            <Badge className="bg-indigo-50 text-indigo-600 border border-indigo-100 font-semibold text-[10px] tracking-wider px-2 py-0.5 rounded-full">Activas</Badge>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Oportunidades Abiertas</p>
                            <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
                                {opportunities.filter((o: Record<string, unknown>) => o.stage !== 'CLOSED_WON' && o.stage !== 'CLOSED_LOST').length}
                            </h3>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full w-1/2 bg-amber-500 rounded-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Pipeline View */}
            <Card className="border border-slate-100 shadow-sm bg-white rounded-2xl overflow-hidden p-4">
                <PipelineViewManager opportunities={opportunities} />
            </Card>
        </div>
    )
}
