import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { settingsService } from "@/features/settings/services/settingsService"
import { VisualReportHeader } from "@/features/accounting/components/VisualReportHeader"
import { SettlementSimulator } from "@/features/payroll/components/SettlementSimulator"
import { Button } from "@/shared/components/ui/button"
import { ArrowLeft, Info } from "lucide-react"
import Link from "next/link"

export default async function PayrollSimulatorPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const tenant = await settingsService.getTenantInfo(supabase)

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl">
                    <Link href="/payroll"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1">
                    <VisualReportHeader
                        title="Simulador de Liquidacion"
                        subtitle="Analisis proyectivo de liquidaciones finales"
                        tenant={tenant}
                    />
                </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex items-start gap-4">
                <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center text-indigo-500 shrink-0">
                    <Info className="h-4 w-4" />
                </div>
                <div>
                    <h2 className="text-sm font-bold text-indigo-900">Como funciona la desvinculacion?</h2>
                    <p className="text-xs text-indigo-600/80 leading-relaxed mt-1">
                        El simulador proyecta el costo total de una terminacion de contrato, incluyendo Prima, Cesantias e Intereses proporcionales al tiempo laborado, mas las vacaciones no disfrutadas.
                    </p>
                </div>
            </div>

            <SettlementSimulator />
        </div>
    )
}
