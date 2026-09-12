import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { commercialService } from '@/features/commercial/services/commercialService'
import { settingsService } from '@/features/settings/services/settingsService'
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader'
import { CommercialStatusBadge } from '@/features/commercial/components/CommercialStatusBadge'
import { Button } from '@/shared/components/ui/button'
import { Plus, Briefcase, Inbox, MapPin, Calendar } from 'lucide-react'
import type { CommercialRequestRow } from '@/features/commercial/types'

export const metadata = { title: 'Gestión Comercial — GVM Corp' }

function fmt(n: number) {
    return `$${Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
}
function fmtDate(d: string | null) {
    if (!d) return null
    try { return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return d }
}

export default async function CommercialPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const isApprover = await commercialService.isApprover(supabase)
    const [mine, tenant, pending] = await Promise.all([
        commercialService.getMyRequests(supabase, user.id),
        settingsService.getTenantInfo(supabase),
        isApprover ? commercialService.getPending(supabase) : Promise.resolve([]),
    ])
    const rows = mine as unknown as CommercialRequestRow[]

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <VisualReportHeader title="Gestión Comercial" subtitle="Solicitudes de viáticos, viajes y gestión comercial" tenant={tenant} />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{rows.length} solicitudes</span>
                <div className="flex items-center gap-3">
                    {isApprover && (
                        <Button asChild variant="outline" className="h-9 rounded-xl border-slate-200 text-xs font-semibold gap-2">
                            <Link href="/commercial/approvals">
                                <Inbox className="h-3.5 w-3.5" /> Aprobaciones
                                {pending.length > 0 && (
                                    <span className="ml-1 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{pending.length}</span>
                                )}
                            </Link>
                        </Button>
                    )}
                    <Button asChild className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold gap-2">
                        <Link href="/commercial/new"><Plus className="h-3.5 w-3.5" /> Nueva solicitud</Link>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {rows.map((r) => (
                    <Link key={r.id} href={`/commercial/${r.id}`}
                        className="block bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-100 transition-all p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 min-w-0">
                                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-indigo-500 shrink-0">
                                    <Briefcase className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono font-black text-indigo-500">{r.number}</span>
                                        <CommercialStatusBadge status={r.status} />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900 truncate mt-0.5">{r.title}</h3>
                                    <div className="flex flex-wrap items-center gap-3 mt-1 text-[10px] text-slate-400 font-medium">
                                        {r.destination && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{r.destination}</span>}
                                        {fmtDate(r.start_date) && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate(r.start_date)}</span>}
                                        {r.party?.legal_name && <span className="truncate">· {r.party.legal_name}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Estimado</p>
                                <p className="text-sm font-black text-slate-900 tabular-nums">{fmt(Number(r.total_estimated))}</p>
                            </div>
                        </div>
                    </Link>
                ))}

                {rows.length === 0 && (
                    <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
                        <Briefcase className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                        <h3 className="text-sm font-bold text-slate-900">Sin solicitudes</h3>
                        <p className="text-xs text-slate-400 mt-1">Crea tu primera solicitud de viáticos o viaje.</p>
                        <Button asChild className="mt-5 h-9 rounded-xl bg-indigo-600 text-xs">
                            <Link href="/commercial/new">Nueva solicitud</Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
