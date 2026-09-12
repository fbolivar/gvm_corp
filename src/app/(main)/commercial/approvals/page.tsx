import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Inbox, MapPin, User } from 'lucide-react'
import { commercialService } from '@/features/commercial/services/commercialService'
import { CommercialStatusBadge } from '@/features/commercial/components/CommercialStatusBadge'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import type { CommercialRequestRow } from '@/features/commercial/types'

export const metadata = { title: 'Aprobaciones — Gestión Comercial' }

const fmt = (n: number) => `$${Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`

const TABS = [
    { key: 'SUBMITTED', label: 'Pendientes' },
    { key: 'APPROVED', label: 'Aprobadas' },
    { key: 'REJECTED', label: 'Rechazadas' },
    { key: 'LIQUIDATED', label: 'Liquidadas' },
    { key: 'ALL', label: 'Todas' },
]

export default async function CommercialApprovalsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const isApprover = await commercialService.isApprover(supabase)
    if (!isApprover) redirect('/commercial')

    const sp = await searchParams
    const active = TABS.some((t) => t.key === sp.status) ? (sp.status as string) : 'SUBMITTED'
    const rows = (await commercialService.getAllRequests(supabase, active)) as unknown as CommercialRequestRow[]

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <Button variant="ghost" asChild className="h-9 px-3 rounded-xl text-slate-400 hover:text-slate-900 text-[10px] font-black uppercase tracking-widest gap-2 w-fit">
                <Link href="/commercial"><ArrowLeft className="h-3.5 w-3.5" /> Volver</Link>
            </Button>

            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-amber-500 flex items-center justify-center text-white"><Inbox className="h-5 w-5" /></div>
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">Aprobaciones</h1>
                    <p className="text-xs text-slate-400 font-medium">Revisa y consulta el histórico de solicitudes del equipo</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
                {TABS.map((t) => (
                    <Link key={t.key} href={`/commercial/approvals?status=${t.key}`}
                        className={cn(
                            'h-9 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center transition-all',
                            active === t.key ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50',
                        )}>
                        {t.label}
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-3">
                {rows.map((r) => (
                    <Link key={r.id} href={`/commercial/${r.id}`}
                        className="block bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-amber-100 transition-all p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono font-black text-indigo-500">{r.number}</span>
                                    <CommercialStatusBadge status={r.status} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 truncate mt-0.5">{r.title}</h3>
                                <div className="flex flex-wrap items-center gap-3 mt-1 text-[10px] text-slate-400 font-medium">
                                    <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{r.requester?.full_name || '—'}</span>
                                    {r.destination && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{r.destination}</span>}
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Estimado</p>
                                <p className="text-sm font-black text-slate-900 tabular-nums">{fmt(Number(r.total_estimated))}</p>
                                {r.status === 'LIQUIDATED' && r.total_actual != null && (
                                    <p className="text-[10px] font-bold text-emerald-600 tabular-nums">Real: {fmt(Number(r.total_actual))}</p>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}

                {rows.length === 0 && (
                    <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
                        <Inbox className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                        <h3 className="text-sm font-bold text-slate-900">Sin solicitudes</h3>
                        <p className="text-xs text-slate-400 mt-1">No hay solicitudes en este estado.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
