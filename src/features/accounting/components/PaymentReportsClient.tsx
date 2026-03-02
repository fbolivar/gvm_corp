'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/shared/lib/utils'
import { Card } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import {
    CheckCircle2,
    XCircle,
    Clock,
    ExternalLink,
    FileText,
    ChevronDown,
    AlertCircle,
    Receipt,
} from 'lucide-react'
import {
    approvePaymentReportAction,
    rejectPaymentReportAction,
    type PaymentReport,
} from '../actions/paymentReportActions'

const STATUS_CFG = {
    PENDING:  { label: 'Pendiente',  cls: 'bg-amber-50 text-amber-700',   icon: Clock },
    APPROVED: { label: 'Aprobado',   cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
    REJECTED: { label: 'Rechazado',  cls: 'bg-rose-50 text-rose-600',      icon: XCircle },
} as const

interface Props {
    initialReports: PaymentReport[]
}

export function PaymentReportsClient({ initialReports }: Props) {
    const [reports, setReports] = useState(initialReports)
    const [rejectingId, setRejectingId] = useState<string | null>(null)
    const [rejectNotes, setRejectNotes] = useState('')
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')
    const [isPending, startTransition] = useTransition()

    const pending  = reports.filter(r => r.status === 'PENDING').length
    const approved = reports.filter(r => r.status === 'APPROVED').length
    const rejected = reports.filter(r => r.status === 'REJECTED').length

    const visible = filter === 'ALL' ? reports : reports.filter(r => r.status === filter)

    const fmt = (n: number) =>
        `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

    const handleApprove = (id: string) => {
        startTransition(async () => {
            const res = await approvePaymentReportAction(id)
            if (res.error) { toast.error(res.error); return }
            setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r))
            toast.success('Comprobante aprobado — Factura marcada como PAGADA')
        })
    }

    const handleReject = (id: string) => {
        if (!rejectNotes.trim()) { toast.error('Ingresa un motivo de rechazo'); return }
        startTransition(async () => {
            const res = await rejectPaymentReportAction(id, rejectNotes)
            if (res.error) { toast.error(res.error); return }
            setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'REJECTED', reviewer_notes: rejectNotes } : r))
            setRejectingId(null)
            setRejectNotes('')
            toast.success('Comprobante rechazado')
        })
    }

    return (
        <div className="space-y-10">
            {/* KPI Strip */}
            <div className="grid grid-cols-3 gap-6">
                <button
                    onClick={() => setFilter(filter === 'PENDING' ? 'ALL' : 'PENDING')}
                    className={cn(
                        "p-8 rounded-[2.5rem] text-left transition-all border-2",
                        filter === 'PENDING'
                            ? "bg-amber-500 border-amber-500 text-white shadow-xl scale-[1.02]"
                            : "bg-white border-slate-100 hover:border-amber-200 hover:bg-amber-50/50 shadow-premium"
                    )}
                >
                    <Clock className={cn("h-6 w-6 mb-4", filter === 'PENDING' ? "text-white" : "text-amber-500")} />
                    <p className={cn("text-[9px] font-black uppercase tracking-widest mb-1", filter === 'PENDING' ? "text-white/70" : "text-slate-400")}>
                        Pendientes de Revisión
                    </p>
                    <p className={cn("text-4xl font-black italic tracking-tighter", filter === 'PENDING' ? "text-white" : "text-amber-600")}>
                        {pending}
                    </p>
                    {pending > 0 && filter !== 'PENDING' && (
                        <span className="inline-flex items-center gap-1 mt-2 text-[9px] font-black text-amber-500 uppercase tracking-widest">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Requieren acción
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setFilter(filter === 'APPROVED' ? 'ALL' : 'APPROVED')}
                    className={cn(
                        "p-8 rounded-[2.5rem] text-left transition-all border-2",
                        filter === 'APPROVED'
                            ? "bg-emerald-500 border-emerald-500 text-white shadow-xl scale-[1.02]"
                            : "bg-white border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 shadow-premium"
                    )}
                >
                    <CheckCircle2 className={cn("h-6 w-6 mb-4", filter === 'APPROVED' ? "text-white" : "text-emerald-500")} />
                    <p className={cn("text-[9px] font-black uppercase tracking-widest mb-1", filter === 'APPROVED' ? "text-white/70" : "text-slate-400")}>
                        Aprobados
                    </p>
                    <p className={cn("text-4xl font-black italic tracking-tighter", filter === 'APPROVED' ? "text-white" : "text-emerald-600")}>
                        {approved}
                    </p>
                </button>

                <button
                    onClick={() => setFilter(filter === 'REJECTED' ? 'ALL' : 'REJECTED')}
                    className={cn(
                        "p-8 rounded-[2.5rem] text-left transition-all border-2",
                        filter === 'REJECTED'
                            ? "bg-rose-500 border-rose-500 text-white shadow-xl scale-[1.02]"
                            : "bg-white border-slate-100 hover:border-rose-200 hover:bg-rose-50/50 shadow-premium"
                    )}
                >
                    <XCircle className={cn("h-6 w-6 mb-4", filter === 'REJECTED' ? "text-white" : "text-rose-500")} />
                    <p className={cn("text-[9px] font-black uppercase tracking-widest mb-1", filter === 'REJECTED' ? "text-white/70" : "text-slate-400")}>
                        Rechazados
                    </p>
                    <p className={cn("text-4xl font-black italic tracking-tighter", filter === 'REJECTED' ? "text-white" : "text-rose-500")}>
                        {rejected}
                    </p>
                </button>
            </div>

            {/* Table */}
            <Card className="border-none shadow-premium bg-white rounded-[3rem] overflow-hidden">
                <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">
                            {filter === 'ALL' ? 'Todos los Comprobantes' :
                             filter === 'PENDING' ? 'Pendientes de Revisión' :
                             filter === 'APPROVED' ? 'Comprobantes Aprobados' : 'Comprobantes Rechazados'}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            {visible.length} registro{visible.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-50">
                                <th className="px-8 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha / Cliente</th>
                                <th className="px-8 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Factura</th>
                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Monto Reportado</th>
                                <th className="px-8 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Notas</th>
                                <th className="px-8 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Evidencia</th>
                                <th className="px-8 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {visible.map((report) => {
                                const doc = Array.isArray(report.document) ? report.document[0] : report.document
                                const party = Array.isArray(report.party) ? report.party[0] : report.party
                                const cfg = STATUS_CFG[report.status]
                                const StatusIcon = cfg.icon
                                const isRejectOpen = rejectingId === report.id

                                return (
                                    <tr
                                        key={report.id}
                                        className={cn(
                                            "transition-colors group",
                                            report.status === 'PENDING' && "bg-amber-50/30 hover:bg-amber-50/50",
                                            report.status === 'APPROVED' && "hover:bg-slate-50/50",
                                            report.status === 'REJECTED' && "bg-rose-50/20 hover:bg-rose-50/30",
                                        )}
                                    >
                                        {/* Date / Client */}
                                        <td className="px-8 py-5">
                                            <p className="text-xs font-black text-slate-900 italic tracking-tight uppercase">
                                                {party?.legal_name ?? 'Cliente'}
                                            </p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                                {format(new Date(report.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                                            </p>
                                            {report.reviewer_notes && report.status !== 'PENDING' && (
                                                <p className="text-[8px] text-slate-400 italic mt-1 max-w-[200px]">
                                                    💬 {report.reviewer_notes}
                                                </p>
                                            )}
                                        </td>

                                        {/* Invoice */}
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm shrink-0">
                                                    <FileText className="h-3.5 w-3.5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-900 italic">
                                                        #{doc?.number ?? '—'}
                                                    </p>
                                                    <p className="text-[9px] text-slate-400 font-bold">
                                                        {doc?.total ? fmt(Number(doc.total)) : '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Amount */}
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-sm font-black text-slate-900 italic tabular-nums">
                                                {fmt(report.amount)}
                                            </span>
                                        </td>

                                        {/* Notes */}
                                        <td className="px-8 py-5 max-w-[180px]">
                                            <p className="text-[10px] text-slate-500 font-medium line-clamp-2">
                                                {report.notes || <span className="text-slate-300 italic">Sin notas</span>}
                                            </p>
                                        </td>

                                        {/* Evidence */}
                                        <td className="px-8 py-5 text-center">
                                            {report.evidence_url ? (
                                                <a
                                                    href={report.evidence_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                    Ver
                                                </a>
                                            ) : (
                                                <span className="text-[9px] text-slate-300 italic">Sin archivo</span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="px-8 py-5 text-center">
                                            <Badge className={cn(
                                                "border-none text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg inline-flex items-center gap-1",
                                                cfg.cls
                                            )}>
                                                <StatusIcon className="h-3 w-3" />
                                                {cfg.label}
                                            </Badge>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-8 py-5">
                                            {report.status === 'PENDING' ? (
                                                <div className="flex flex-col items-end gap-2">
                                                    {!isRejectOpen ? (
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                disabled={isPending}
                                                                onClick={() => handleApprove(report.id)}
                                                                className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest border-none shadow-sm"
                                                            >
                                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                Aprobar
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                disabled={isPending}
                                                                onClick={() => { setRejectingId(report.id); setRejectNotes('') }}
                                                                className="h-9 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-[9px] font-black uppercase tracking-widest border-none"
                                                            >
                                                                <XCircle className="h-3 w-3 mr-1" />
                                                                Rechazar
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-end gap-2 w-full max-w-[260px]">
                                                            <input
                                                                autoFocus
                                                                value={rejectNotes}
                                                                onChange={e => setRejectNotes(e.target.value)}
                                                                placeholder="Motivo del rechazo..."
                                                                className="w-full px-3 py-2 text-[10px] font-bold border border-rose-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 text-slate-700 placeholder:text-slate-300"
                                                            />
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    disabled={isPending}
                                                                    onClick={() => handleReject(report.id)}
                                                                    className="h-8 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-black uppercase border-none"
                                                                >
                                                                    Confirmar
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => setRejectingId(null)}
                                                                    className="h-8 px-3 rounded-xl text-slate-400 text-[9px] font-black uppercase border-none"
                                                                >
                                                                    Cancelar
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[9px] text-slate-300 italic font-medium">—</span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}

                            {visible.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-10 py-20 text-center">
                                        <Receipt className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                                            {filter === 'PENDING'
                                                ? 'Sin comprobantes pendientes — todo al día'
                                                : 'No hay comprobantes en esta categoría'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Alert for pending */}
            {pending > 0 && filter !== 'PENDING' && (
                <div className="flex items-center gap-6 p-8 bg-amber-50 border border-amber-100 rounded-[2.5rem]">
                    <AlertCircle className="h-8 w-8 text-amber-500 shrink-0" />
                    <div>
                        <p className="text-sm font-black text-amber-800 italic uppercase tracking-tight">
                            {pending} comprobante{pending !== 1 ? 's' : ''} pendiente{pending !== 1 ? 's' : ''} de revisión
                        </p>
                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-0.5">
                            Filtra por "Pendientes" para revisarlos y liberar el flujo de caja
                        </p>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => setFilter('PENDING')}
                        className="ml-auto h-10 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[9px] uppercase tracking-widest border-none shrink-0"
                    >
                        Ver Pendientes
                    </Button>
                </div>
            )}
        </div>
    )
}
