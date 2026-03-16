import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { settingsService } from "@/features/settings/services/settingsService"
import { attendanceService } from "@/features/payroll/services/attendanceService"
import { VisualReportHeader } from "@/features/accounting/components/VisualReportHeader"
import { PunctualityReport } from "@/features/payroll/components/PunctualityReport"
import { Button } from "@/shared/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function PunctualityPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const tenant = await settingsService.getTenantInfo(supabase)
    if (!tenant) redirect('/login')

    // Current month range
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0)
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

    const records = await attendanceService.getPunctualityReport(supabase, startDate, endDate).catch(() => [])

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl shrink-0">
                    <Link href="/payroll"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1">
                    <VisualReportHeader
                        title="Reporte de Puntualidad"
                        subtitle="Metricas de asistencia, tardanzas y horas extra por empleado"
                        tenant={tenant}
                    />
                </div>
            </div>

            <PunctualityReport
                records={records}
                startDate={startDate}
                endDate={endDate}
            />
        </div>
    )
}
