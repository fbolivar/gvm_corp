import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { settingsService } from "@/features/settings/services/settingsService"
import { academyService } from "@/features/academy/services/academyService"
import { VisualReportHeader } from "@/features/accounting/components/VisualReportHeader"
import { AcademyReports } from "@/features/academy/components/AcademyReports"
import { Button } from "@/shared/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function AcademyReportsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const tenant = await settingsService.getTenantInfo(supabase)
    if (!tenant) redirect('/login')

    const reports = await academyService.getCourseCompletionReport(supabase).catch(() => [])

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl shrink-0">
                    <Link href="/academy/manage"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1">
                    <VisualReportHeader title="Reportes de Adopcion" subtitle="Metricas de uso y completitud de la Academia" tenant={tenant} />
                </div>
            </div>

            <AcademyReports reports={reports} />
        </div>
    )
}
