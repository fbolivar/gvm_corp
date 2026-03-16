"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/shared/lib/utils"
import { registerRadianEventAction, sendRadianEventAction } from "../actions/radianActions"
import {
    FileCheck2,
    Send,
    Loader2,
    CheckCircle2,
    XCircle,
    Clock,
    ChevronDown,
} from "lucide-react"

interface RadianEvent {
    id: string
    event_code: string
    event_description: string
    response_code: string | null
    response_message: string | null
    sent_at: string | null
    responded_at: string | null
    status: string
}

interface Props {
    electronicDocId: string
    events: RadianEvent[]
}

const EVENTS = [
    { code: '030', label: 'Acuse de Recibo' },
    { code: '031', label: 'Recibo del Bien' },
    { code: '032', label: 'Aceptación Expresa' },
    { code: '033', label: 'Rechazo' },
]

type StatusKey = 'PENDING' | 'SENT' | 'ACCEPTED' | 'REJECTED';

interface StatusConfig {
    label: string;
    color: string;
    icon: React.ElementType;
}

const STATUS_CONFIG: Record<StatusKey, StatusConfig> = {
    PENDING: { label: 'Pendiente', color: 'bg-slate-100 text-slate-600', icon: Clock },
    SENT: { label: 'Enviado', color: 'bg-blue-50 text-blue-600', icon: Send },
    ACCEPTED: { label: 'Aceptado', color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 },
    REJECTED: { label: 'Rechazado', color: 'bg-rose-50 text-rose-600', icon: XCircle },
}

export function RadianEventsPanel({ electronicDocId, events }: Props) {
    const router = useRouter()
    const [registering, setRegistering] = useState<string | null>(null)
    const [sending, setSending] = useState<string | null>(null)
    const [showSelector, setShowSelector] = useState(false)

    const handleRegister = async (eventCode: string) => {
        setRegistering(eventCode)
        const result = await registerRadianEventAction(electronicDocId, eventCode)
        setRegistering(null)
        if ('error' in result && result.error) {
            toast.error(result.error)
        } else {
            toast.success("Evento RADIAN registrado")
            setShowSelector(false)
            router.refresh()
        }
    }

    const handleSend = async (eventId: string) => {
        setSending(eventId)
        const result = await sendRadianEventAction(eventId)
        setSending(null)
        if ('error' in result && result.error) {
            toast.error(result.error)
        } else {
            toast.success(('message' in result && result.message) ? result.message : "Evento enviado")
            router.refresh()
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-1 w-5 bg-violet-500 rounded-full" />
                    <FileCheck2 className="h-5 w-5 text-violet-500" />
                    <h3 className="text-sm font-black italic uppercase tracking-tight text-slate-900">
                        Eventos RADIAN
                    </h3>
                </div>
                <Button
                    onClick={() => setShowSelector(!showSelector)}
                    className="h-8 px-4 rounded-lg text-[10px] font-bold bg-violet-600 hover:bg-violet-700 text-white"
                >
                    <FileCheck2 className="h-3 w-3 mr-1.5" />
                    Registrar Evento
                    <ChevronDown className="h-3 w-3 ml-1.5" />
                </Button>
            </div>

            {/* Event type selector */}
            {showSelector && (
                <div className="bg-violet-50/50 rounded-xl p-4 border border-violet-100 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {EVENTS.map(ev => (
                        <button
                            key={ev.code}
                            onClick={() => handleRegister(ev.code)}
                            disabled={registering === ev.code}
                            className={cn(
                                "px-3 py-2 rounded-lg text-xs font-bold border transition-all text-left",
                                "bg-white border-violet-200 hover:border-violet-400 text-slate-700",
                                "disabled:opacity-50 disabled:cursor-not-allowed",
                            )}
                        >
                            {registering === ev.code ? (
                                <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                            ) : (
                                <span className="text-violet-500 font-mono mr-1">{ev.code}</span>
                            )}
                            {ev.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Events list */}
            {events.length === 0 ? (
                <div className="text-center py-6 text-slate-300">
                    <FileCheck2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold uppercase tracking-widest">Sin eventos RADIAN</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {events.map(event => {
                        const statusKey = (event.status as StatusKey) in STATUS_CONFIG
                            ? (event.status as StatusKey)
                            : 'PENDING'
                        const cfg = STATUS_CONFIG[statusKey]
                        const Icon = cfg.icon

                        return (
                            <div
                                key={event.id}
                                className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", cfg.color)}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Badge className="text-[8px] font-mono bg-slate-200 text-slate-600 border-none rounded px-1.5">
                                                {event.event_code}
                                            </Badge>
                                            <span className="text-sm font-bold text-slate-900">
                                                {event.event_description}
                                            </span>
                                        </div>
                                        {event.response_message && (
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                {event.response_message}
                                            </p>
                                        )}
                                        {event.sent_at && (
                                            <p className="text-[10px] text-slate-400">
                                                Enviado: {new Date(event.sent_at).toLocaleString('es-CO')}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Badge className={cn("text-[8px] font-bold rounded-full px-2 py-0.5 border-none", cfg.color)}>
                                        {cfg.label}
                                    </Badge>
                                    {event.status === 'PENDING' && (
                                        <Button
                                            onClick={() => handleSend(event.id)}
                                            disabled={sending === event.id}
                                            size="sm"
                                            className="h-7 px-3 rounded-lg text-[9px] font-bold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
                                        >
                                            {sending === event.id ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                                <>
                                                    <Send className="h-3 w-3 mr-1" />
                                                    Enviar
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
