import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { settingsService } from "@/features/settings/services/settingsService"
import { SettlementForm } from "@/features/payroll/components/SettlementForm"
import { VisualReportHeader } from "@/features/accounting/components/VisualReportHeader"
import { Button } from "@/shared/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function PayrollSettlementPage() {
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
                        title="Retiros y Liquidacion"
                        subtitle="Calculo y generacion de liquidaciones finales"
                        tenant={tenant}
                    />
                </div>
            </div>

            <SettlementForm />
        </div>
    )
}
