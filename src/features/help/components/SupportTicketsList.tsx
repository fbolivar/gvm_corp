"use client"

import { cn } from "@/shared/lib/utils"
import { Ticket, RefreshCw, Clock } from "lucide-react"
import type { SupportTicketRow } from "../actions"

function statusInfo(s: string): { label: string; cls: string } {
    switch (s) {
        case 'open':
        case 'in_progress':
            return { label: 'Abierto', cls: 'bg-amber-50 text-amber-600' }
        case 'pending':
            return { label: 'En espera', cls: 'bg-slate-100 text-slate-500' }
        case 'resolved':
        case 'closed':
            return { label: 'Cerrado', cls: 'bg-emerald-50 text-emerald-600' }
        default:
            return { label: s, cls: 'bg-slate-100 text-slate-500' }
    }
}

const PRIORITY_LABEL: Record<string, string> = {
    low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica',
}

function fmtDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('es-CO', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota',
        })
    } catch {
        return iso
    }
}

interface Props {
    tickets: SupportTicketRow[]
    loading: boolean
    onRefresh: () => void
}

export function SupportTicketsList({ tickets, loading, onRefresh }: Props) {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                        <Ticket className="h-5 w-5" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight italic">Mis casos de soporte</h2>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                >
                    <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                    Actualizar
                </button>
            </div>

            <div className="bg-white shadow-premium rounded-[2.5rem] overflow-hidden">
                {tickets.length === 0 ? (
                    <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center">
                            <Ticket className="h-6 w-6 text-slate-300" />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Aún no has reportado casos
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {tickets.map((t) => {
                            const st = statusInfo(t.status)
                            return (
                                <div key={t.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {t.hexdesk_ticket_number != null && (
                                                <span className="text-[10px] font-mono font-black text-indigo-500">#{t.hexdesk_ticket_number}</span>
                                            )}
                                            <p className="text-sm font-bold text-slate-900 truncate">{t.subject}</p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-medium">
                                            <Clock className="h-3 w-3" />
                                            {fmtDate(t.created_at)}
                                            <span className="text-slate-300">·</span>
                                            <span className="uppercase tracking-wide">Prioridad {PRIORITY_LABEL[t.priority] ?? t.priority}</span>
                                            {!t.synced && (
                                                <>
                                                    <span className="text-slate-300">·</span>
                                                    <span className="text-amber-500 font-bold uppercase tracking-wide">Envío pendiente</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <span className={cn("inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shrink-0", st.cls)}>
                                        {st.label}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
