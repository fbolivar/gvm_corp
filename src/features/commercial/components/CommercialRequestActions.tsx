'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Send, CheckCircle2, XCircle, Loader2, Trash2, Wallet } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { Input } from '@/shared/components/ui/input'
import { useConfirm } from '@/shared/hooks/useConfirm'
import {
    submitCommercialRequestAction,
    decideCommercialRequestAction,
    liquidateCommercialRequestAction,
    deleteCommercialRequestAction,
} from '../actions'
import type { CommercialItemRow, CommercialStatus } from '../types'

interface Props {
    id: string
    status: CommercialStatus
    isOwner: boolean
    isApprover: boolean
    items: CommercialItemRow[]
}

function fmt(n: number) {
    return `$${Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
}

export function CommercialRequestActions({ id, status, isOwner, isApprover, items }: Props) {
    const router = useRouter()
    const [busy, setBusy] = useState<string | null>(null)
    const [rejectOpen, setRejectOpen] = useState(false)
    const [rejectNotes, setRejectNotes] = useState('')
    const [liqOpen, setLiqOpen] = useState(false)
    const [actuals, setActuals] = useState<Record<string, number>>(() =>
        Object.fromEntries(items.map((i) => [i.id, Number(i.subtotal) || 0])),
    )
    const [ConfirmEl, confirm] = useConfirm()

    const run = async (key: string, fn: () => Promise<{ error?: string; success?: boolean }>, okMsg: string) => {
        setBusy(key)
        const res = await fn()
        setBusy(null)
        if (res.error) { toast.error(res.error); return false }
        toast.success(okMsg)
        router.refresh()
        return true
    }

    const canSubmit = isOwner && (status === 'DRAFT' || status === 'REJECTED')
    const canDecide = isApprover && status === 'SUBMITTED'
    const canLiquidate = (isOwner || isApprover) && status === 'APPROVED'
    const canDelete = isOwner && (status === 'DRAFT' || status === 'REJECTED')

    return (
        <div className="space-y-4">
            {ConfirmEl}
            <div className="flex flex-wrap gap-3">
                {canSubmit && (
                    <Button disabled={busy !== null} onClick={() => run('submit', () => submitCommercialRequestAction(id), 'Enviada a aprobación')}
                        className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest gap-2">
                        {busy === 'submit' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar a aprobación
                    </Button>
                )}

                {canDecide && (
                    <>
                        <Button disabled={busy !== null} onClick={() => run('approve', () => decideCommercialRequestAction(id, 'APPROVED'), 'Solicitud aprobada')}
                            className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest gap-2">
                            {busy === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Aprobar
                        </Button>
                        <Button disabled={busy !== null} variant="outline" onClick={() => setRejectOpen((v) => !v)}
                            className="h-11 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 font-black text-[10px] uppercase tracking-widest gap-2">
                            <XCircle className="h-4 w-4" /> Rechazar
                        </Button>
                    </>
                )}

                {canLiquidate && (
                    <Button disabled={busy !== null} onClick={() => setLiqOpen((v) => !v)}
                        className="h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest gap-2">
                        <Wallet className="h-4 w-4" /> Liquidar
                    </Button>
                )}

                {canDelete && (
                    <Button disabled={busy !== null} variant="outline"
                        onClick={async () => {
                            const ok = await confirm({ title: 'Eliminar solicitud', description: '¿Seguro que deseas eliminar esta solicitud?', variant: 'danger', confirmLabel: 'Eliminar' })
                            if (!ok) return
                            const done = await run('delete', () => deleteCommercialRequestAction(id), 'Solicitud eliminada')
                            if (done) router.push('/commercial')
                        }}
                        className="h-11 rounded-xl border-slate-200 text-slate-500 hover:bg-slate-50 font-black text-[10px] uppercase tracking-widest gap-2">
                        <Trash2 className="h-4 w-4" /> Eliminar
                    </Button>
                )}
            </div>

            {/* Rechazo con motivo */}
            {rejectOpen && canDecide && (
                <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 space-y-3">
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Motivo del rechazo</p>
                    <Textarea value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} rows={2}
                        placeholder="Explica por qué se rechaza…" className="rounded-xl border-rose-200 bg-white text-sm" />
                    <Button disabled={busy !== null} onClick={async () => {
                        const done = await run('reject', () => decideCommercialRequestAction(id, 'REJECTED', rejectNotes || undefined), 'Solicitud rechazada')
                        if (done) setRejectOpen(false)
                    }}
                        className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest gap-2">
                        {busy === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Confirmar rechazo
                    </Button>
                </div>
            )}

            {/* Liquidación */}
            {liqOpen && canLiquidate && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Costos reales (liquidación)</p>
                    <div className="space-y-2">
                        {items.map((it) => (
                            <div key={it.id} className="flex items-center gap-3">
                                <span className="text-xs text-slate-600 flex-1 truncate">{it.description || it.type}</span>
                                <span className="text-[10px] text-slate-400">Est. {fmt(Number(it.subtotal))}</span>
                                <Input type="number" step="1" min="0" value={actuals[it.id] ?? 0}
                                    onChange={(e) => setActuals((p) => ({ ...p, [it.id]: Number(e.target.value) }))}
                                    className="h-9 w-32 rounded-lg border-slate-200 bg-white text-sm text-right tabular-nums" />
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total real</span>
                        <span className="text-lg font-black text-slate-900 tabular-nums">
                            {fmt(Object.values(actuals).reduce((s, v) => s + (Number(v) || 0), 0))}
                        </span>
                    </div>
                    <Button disabled={busy !== null} onClick={async () => {
                        const payload = items.map((it) => ({ item_id: it.id, actual_cost: Number(actuals[it.id]) || 0 }))
                        const done = await run('liq', () => liquidateCommercialRequestAction(id, payload), 'Solicitud liquidada')
                        if (done) setLiqOpen(false)
                    }}
                        className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest gap-2">
                        {busy === 'liq' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />} Confirmar liquidación
                    </Button>
                </div>
            )}
        </div>
    )
}
