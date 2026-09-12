import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, Building2, User, Briefcase, History, Pencil, Clock } from 'lucide-react'
import { commercialService } from '@/features/commercial/services/commercialService'
import { settingsService } from '@/features/settings/services/settingsService'
import { CommercialStatusBadge } from '@/features/commercial/components/CommercialStatusBadge'
import { CommercialRequestActions } from '@/features/commercial/components/CommercialRequestActions'
import { CommercialPdfButton } from '@/features/commercial/components/CommercialPdfButton'
import { CommercialAttachments } from '@/features/commercial/components/CommercialAttachments'
import { ITEM_TYPE_LABELS, type CommercialItemRow, type CommercialEventRow, type CommercialStatus } from '@/features/commercial/types'
import { Button } from '@/shared/components/ui/button'

const fmt = (n: number) => `$${Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
const fmtDate = (d: string | null) => {
    if (!d) return '—'
    try { return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return d }
}
const fmtDateTime = (d: string | null) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' }) } catch { return d }
}

const EVENT_LABELS: Record<string, string> = {
    CREATE: 'Creada', SUBMIT: 'Enviada a aprobación', APPROVE: 'Aprobada', REJECT: 'Rechazada', LIQUIDATE: 'Liquidada',
}

export default async function CommercialDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [req, isApprover, tenant] = await Promise.all([
        commercialService.getById(supabase, id),
        commercialService.isApprover(supabase),
        settingsService.getTenantInfo(supabase),
    ])
    if (!req) notFound()

    const r = req as Record<string, any>
    const status = r.status as CommercialStatus
    const items = (r.items ?? []) as CommercialItemRow[]
    const events = ([...(r.events ?? [])] as CommercialEventRow[]).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    const isOwner = r.requester_id === user.id
    const isLiquidated = status === 'LIQUIDATED'
    const attachments = await commercialService.signAttachments(r.attachments as Array<Record<string, unknown>>)
    const canEditAttachments = isOwner && status !== 'LIQUIDATED'
    const canEditRequest = isOwner && (status === 'DRAFT' || status === 'REJECTED')

    return (
        <div className="page-container space-y-6 pb-24 animate-in fade-in duration-500">
            <Button variant="ghost" asChild className="h-9 px-3 rounded-xl text-slate-400 hover:text-slate-900 text-[10px] font-black uppercase tracking-widest gap-2 w-fit">
                <Link href="/commercial"><ArrowLeft className="h-3.5 w-3.5" /> Volver</Link>
            </Button>

            {/* Header */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.05]"><Briefcase className="h-40 w-40" /></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 flex-wrap">
                    <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-black text-indigo-300">{r.number}</span>
                            <CommercialStatusBadge status={status} />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight">{r.title}</h1>
                        {r.purpose && <p className="text-white/50 text-sm max-w-2xl">{r.purpose}</p>}
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Total estimado</p>
                        <p className="text-3xl font-black tabular-nums">{fmt(Number(r.total_estimated))}</p>
                        {isLiquidated && (
                            <p className="text-xs font-bold text-emerald-300 mt-1 tabular-nums">Real: {fmt(Number(r.total_actual))}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Meta + acciones */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Conceptos */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conceptos</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50/60 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                        <th className="px-6 py-3 text-left">Tipo</th>
                                        <th className="px-4 py-3 text-left">Descripción</th>
                                        <th className="px-4 py-3 text-right">Cant.</th>
                                        <th className="px-4 py-3 text-right">Costo Unit.</th>
                                        <th className="px-4 py-3 text-right">Subtotal</th>
                                        {isLiquidated && <th className="px-6 py-3 text-right">Real</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {items.map((it) => (
                                        <tr key={it.id}>
                                            <td className="px-6 py-3">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                                                    {ITEM_TYPE_LABELS[it.type] ?? it.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">
                                                {it.description || '—'}
                                                {it.schedule && (
                                                    <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-indigo-600">
                                                        <Clock className="h-3 w-3" /> {it.schedule}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums">{Number(it.quantity).toLocaleString('es-CO')}</td>
                                            <td className="px-4 py-3 text-right tabular-nums text-slate-500">{fmt(Number(it.unit_cost))}</td>
                                            <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-900">{fmt(Number(it.subtotal))}</td>
                                            {isLiquidated && <td className="px-6 py-3 text-right tabular-nums font-bold text-emerald-600">{fmt(Number(it.actual_cost ?? 0))}</td>}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-50/60 border-t border-slate-100 font-black">
                                        <td className="px-6 py-3 text-[10px] text-slate-400 uppercase tracking-wider" colSpan={4}>Total</td>
                                        <td className="px-4 py-3 text-right tabular-nums text-slate-900">{fmt(Number(r.total_estimated))}</td>
                                        {isLiquidated && <td className="px-6 py-3 text-right tabular-nums text-emerald-600">{fmt(Number(r.total_actual))}</td>}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Adjuntos */}
                    <CommercialAttachments requestId={id} files={attachments} canEdit={canEditAttachments} />

                    {/* Motivo de rechazo */}
                    {status === 'REJECTED' && r.decision_notes && (
                        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5">
                            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Motivo del rechazo</p>
                            <p className="text-sm text-rose-800">{r.decision_notes}</p>
                        </div>
                    )}

                    {/* Acciones */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                        <div className="flex flex-wrap gap-3">
                            {canEditRequest && (
                                <Button asChild variant="outline" className="h-11 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-black text-[10px] uppercase tracking-widest gap-2">
                                    <Link href={`/commercial/${id}/edit`}><Pencil className="h-4 w-4" /> Editar</Link>
                                </Button>
                            )}
                            <CommercialPdfButton request={r} items={items} tenant={tenant} />
                        </div>
                        <CommercialRequestActions id={id} status={status} isOwner={isOwner} isApprover={isApprover} items={items} />
                    </div>

                    {/* Historial */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                            <History className="h-3.5 w-3.5" /> Historial
                        </h3>
                        <div className="space-y-3">
                            {events.map((ev) => (
                                <div key={ev.id} className="flex items-start gap-3">
                                    <div className="h-2 w-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-800">
                                            {EVENT_LABELS[ev.action] ?? ev.action}
                                            <span className="text-slate-300 font-medium mx-1">·</span>
                                            <span className="font-medium text-slate-500">{ev.actor?.full_name || 'Sistema'}</span>
                                        </p>
                                        {ev.notes && <p className="text-[11px] text-slate-500 mt-0.5">{ev.notes}</p>}
                                    </div>
                                    <span className="text-[10px] text-slate-400 shrink-0">{fmtDateTime(ev.created_at)}</span>
                                </div>
                            ))}
                            {events.length === 0 && <p className="text-xs text-slate-400">Sin movimientos.</p>}
                        </div>
                    </div>
                </div>

                {/* Panel lateral */}
                <div className="space-y-4">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalle</h3>
                        <Field icon={<User className="h-3.5 w-3.5" />} label="Solicitante" value={r.requester?.full_name || r.requester?.email || '—'} />
                        <Field icon={<MapPin className="h-3.5 w-3.5" />} label="Destino" value={r.destination || '—'} />
                        <Field icon={<Calendar className="h-3.5 w-3.5" />} label="Fechas" value={`${fmtDate(r.start_date)} → ${fmtDate(r.end_date)}`} />
                        {r.party?.legal_name && <Field icon={<Building2 className="h-3.5 w-3.5" />} label="Cliente" value={r.party.legal_name} />}
                        {r.approver?.full_name && <Field icon={<User className="h-3.5 w-3.5" />} label="Aprobado/decidido por" value={r.approver.full_name} />}
                        <Field icon={<Calendar className="h-3.5 w-3.5" />} label="Creada" value={fmtDateTime(r.created_at)} />
                    </div>
                </div>
            </div>
        </div>
    )
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">{icon}{label}</span>
            <span className="text-xs font-bold text-slate-900 text-right">{value}</span>
        </div>
    )
}
