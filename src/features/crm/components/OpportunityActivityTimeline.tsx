"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { addActivityAction } from "../actions"
import { Button } from "@/shared/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/shared/lib/utils"
import {
    ArrowRightLeft,
    MessageSquare,
    Phone,
    Mail,
    Users,
    ClipboardCheck,
    Plus,
    Loader2,
    Send,
} from "lucide-react"

interface Activity {
    id: string
    type: string
    title: string
    description: string | null
    old_stage: string | null
    new_stage: string | null
    old_probability: number | null
    new_probability: number | null
    created_at: string
    profiles: { full_name: string | null; email: string | null } | null
}

interface Props {
    opportunityId: string
    activities: Activity[]
}

const ACTIVITY_TYPES = [
    { value: 'NOTE', label: 'Nota', icon: MessageSquare },
    { value: 'CALL', label: 'Llamada', icon: Phone },
    { value: 'EMAIL', label: 'Email', icon: Mail },
    { value: 'MEETING', label: 'Reunión', icon: Users },
    { value: 'TASK', label: 'Tarea', icon: ClipboardCheck },
] as const

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
    STAGE_CHANGE: { icon: ArrowRightLeft, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
    NOTE: { icon: MessageSquare, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-100' },
    CALL: { icon: Phone, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
    EMAIL: { icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
    MEETING: { icon: Users, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-100' },
    TASK: { icon: ClipboardCheck, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
}

const STAGE_LABELS: Record<string, string> = {
    PROSPECTING: 'Prospección',
    QUALIFICATION: 'Calificación',
    PROPOSAL: 'Propuesta',
    NEGOTIATION: 'Negociación',
    CLOSED_WON: 'Ganada',
    CLOSED_LOST: 'Perdida',
}

export function OpportunityActivityTimeline({ opportunityId, activities }: Props) {
    const router = useRouter()
    const [showForm, setShowForm] = useState(false)
    const [type, setType] = useState('NOTE')
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        if (!title.trim()) { toast.error("El título es requerido"); return; }
        setLoading(true)
        const result = await addActivityAction(opportunityId, {
            type,
            title: title.trim(),
            description: description.trim() || undefined,
        })
        setLoading(false)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Actividad registrada")
            setTitle('')
            setDescription('')
            setShowForm(false)
            router.refresh()
        }
    }

    return (
        <div className="space-y-6">
            {/* Add Activity Button / Form */}
            {!showForm ? (
                <Button
                    onClick={() => setShowForm(true)}
                    className="h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 hover:bg-slate-800 text-white"
                >
                    <Plus className="h-3.5 w-3.5 mr-2" />
                    Registrar Actividad
                </Button>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 shadow-sm">
                    {/* Type selector */}
                    <div className="flex flex-wrap gap-2">
                        {ACTIVITY_TYPES.map(at => {
                            const Icon = at.icon
                            return (
                                <button
                                    key={at.value}
                                    onClick={() => setType(at.value)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all",
                                        type === at.value
                                            ? "bg-slate-900 text-white border-slate-900"
                                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                    )}
                                >
                                    <Icon className="h-3 w-3" />
                                    {at.label}
                                </button>
                            )
                        })}
                    </div>

                    {/* Title */}
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Título de la actividad..."
                        className="w-full h-10 px-4 rounded-lg border border-slate-200 text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                    />

                    {/* Description */}
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Detalles o notas adicionales (opcional)..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 resize-none"
                    />

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="h-9 px-4 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Send className="h-3.5 w-3.5 mr-2" />}
                            Guardar
                        </Button>
                        <Button
                            onClick={() => { setShowForm(false); setTitle(''); setDescription(''); }}
                            variant="ghost"
                            className="h-9 px-4 rounded-lg text-xs font-bold text-slate-400"
                        >
                            Cancelar
                        </Button>
                    </div>
                </div>
            )}

            {/* Timeline */}
            {activities.length === 0 ? (
                <div className="text-center py-8 text-slate-300">
                    <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p className="text-xs font-bold uppercase tracking-widest">Sin actividades registradas</p>
                </div>
            ) : (
                <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-100" />

                    <div className="space-y-4">
                        {activities.map(activity => {
                            const config = TYPE_CONFIG[activity.type] || TYPE_CONFIG.NOTE
                            const Icon = config.icon
                            const profile = activity.profiles

                            return (
                                <div key={activity.id} className="relative flex gap-4 pl-0">
                                    {/* Icon */}
                                    <div className={cn(
                                        "relative z-10 h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
                                        config.bg, config.color
                                    )}>
                                        <Icon className="h-4 w-4" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 pb-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-slate-900">{activity.title}</p>
                                                {activity.type === 'STAGE_CHANGE' && activity.old_stage && activity.new_stage && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                                                            {STAGE_LABELS[activity.old_stage] || activity.old_stage}
                                                            {activity.old_probability != null && ` (${activity.old_probability}%)`}
                                                        </span>
                                                        <ArrowRightLeft className="h-3 w-3 text-slate-300" />
                                                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                            {STAGE_LABELS[activity.new_stage] || activity.new_stage}
                                                            {activity.new_probability != null && ` (${activity.new_probability}%)`}
                                                        </span>
                                                    </div>
                                                )}
                                                {activity.description && (
                                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{activity.description}</p>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-medium shrink-0">
                                                {new Date(activity.created_at).toLocaleDateString('es-CO', {
                                                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                        {profile && (
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                {profile.full_name || profile.email}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
