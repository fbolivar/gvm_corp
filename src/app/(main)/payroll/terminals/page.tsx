import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { settingsService } from "@/features/settings/services/settingsService"
import { kioskService } from "@/features/payroll/services/kioskService"
import { VisualReportHeader } from "@/features/accounting/components/VisualReportHeader"
import { TerminalManager } from "@/features/payroll/components/TerminalManager"
import { Button } from "@/shared/components/ui/button"
import Link from "next/link"
import { ArrowLeft, QrCode, Monitor } from "lucide-react"

export default async function TerminalsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const tenant = await settingsService.getTenantInfo(supabase)
    if (!tenant) redirect('/login')

    const terminals = await kioskService.getTerminals(supabase)

    // Build base URL from request headers
    const headerList = await headers()
    const host = headerList.get('host') || 'localhost:3000'
    const proto = headerList.get('x-forwarded-proto') || 'http'
    const baseUrl = `${proto}://${host}`

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl shrink-0">
                    <Link href="/payroll"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1">
                    <VisualReportHeader
                        title="Terminales QR"
                        subtitle="Gestiona los terminales de asistencia por codigo QR para tus empleados"
                        tenant={tenant}
                    />
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                        <Monitor className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Terminales</p>
                        <p className="text-xl font-bold text-slate-900">{terminals.length}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                        <QrCode className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Activos</p>
                        <p className="text-xl font-bold text-slate-900">{terminals.filter(t => t.is_active).length}</p>
                    </div>
                </div>
            </div>

            {/* How it works */}
            <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-5">
                <h3 className="text-sm font-bold text-indigo-900 mb-3">Como funciona</h3>
                <ol className="space-y-2 text-xs text-indigo-700">
                    <li className="flex gap-2"><span className="font-black text-indigo-500">1.</span> Crea un terminal y copia la URL generada</li>
                    <li className="flex gap-2"><span className="font-black text-indigo-500">2.</span> Abre la URL en una tablet/celular fijo en la entrada</li>
                    <li className="flex gap-2"><span className="font-black text-indigo-500">3.</span> Imprime el carnet QR de cada empleado desde su ficha en <Link href="/payroll/employees" className="underline font-semibold">Empleados</Link></li>
                    <li className="flex gap-2"><span className="font-black text-indigo-500">4.</span> Los empleados escanean su carnet al llegar/salir</li>
                </ol>
            </div>

            <TerminalManager terminals={terminals} baseUrl={baseUrl} />
        </div>
    )
}
