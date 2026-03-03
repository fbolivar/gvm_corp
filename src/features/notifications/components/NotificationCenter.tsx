'use client'

import { useState, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/shared/lib/utils'
import {
    Bell,
    ShieldAlert,
    Package,
    DollarSign,
    Droplets,
    Truck,
    Activity,
    CheckCheck,
    Trash2,
    Zap,
    AlertTriangle,
    RefreshCw,
    CheckCircle2,
} from 'lucide-react'
import {
    markAsReadAction,
    markAllAsReadAction,
    deleteNotificationAction,
    triggerSystemAlertsAction,
    NotificationFilter,
} from '../actions'
import { AppNotification, NotificationCategory, NotificationPriority } from '../types'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface NotificationCenterProps {
    initialNotifications: AppNotification[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<NotificationCategory, React.ComponentType<{ className?: string }>> = {
    OPERATIONS: Activity,
    SECURITY: ShieldAlert,
    INVENTORY: Package,
    BILLING: DollarSign,
    LIQUIDITY: Droplets,
    LOGISTICS: Truck,
    GENERAL: Bell,
}

const PRIORITY_STYLES: Record<NotificationPriority, string> = {
    CRITICAL: 'bg-rose-100 text-rose-700 border-rose-200',
    HIGH: 'bg-amber-100 text-amber-700 border-amber-200',
    MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
    LOW: 'bg-slate-100 text-slate-500 border-slate-200',
}

const PRIORITY_LABELS: Record<NotificationPriority, string> = {
    CRITICAL: 'Crítica',
    HIGH: 'Alta',
    MEDIUM: 'Media',
    LOW: 'Baja',
}

const ICON_CONTAINER_STYLES: Record<NotificationPriority, string> = {
    CRITICAL: 'bg-rose-500 text-white border-rose-400',
    HIGH: 'bg-amber-500 text-white border-amber-400',
    MEDIUM: 'bg-indigo-500 text-white border-indigo-400',
    LOW: 'bg-slate-300 text-slate-600 border-slate-200',
}

function relativeTime(date: string): string {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
    label: string
    value: number
    accent: string
}

function StatCard({ label, value, accent }: StatCardProps) {
    return (
        <div className={cn('rounded-2xl border p-4 flex flex-col gap-1', accent)}>
            <span className="text-2xl font-black">{value}</span>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</span>
        </div>
    )
}

// ─── Notification Item ────────────────────────────────────────────────────────

interface NotificationItemProps {
    notification: AppNotification
    onRead: (id: string) => void
    onDelete: (id: string) => void
}

function NotificationItem({ notification: n, onRead, onDelete }: NotificationItemProps) {
    const CategoryIcon = CATEGORY_ICONS[n.category] ?? Bell

    const cardContent = (
        <div className={cn(
            'group/item relative flex gap-4 p-4 rounded-2xl border transition-all duration-200',
            n.is_read
                ? 'bg-slate-50 border-slate-100 opacity-70'
                : 'bg-white border-indigo-100 shadow-sm hover:shadow-md hover:border-indigo-200'
        )}>
            {/* Category icon */}
            <div className={cn(
                'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm',
                ICON_CONTAINER_STYLES[n.priority]
            )}>
                <CategoryIcon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                        'text-xs font-black leading-tight italic',
                        n.is_read ? 'text-slate-500' : 'text-slate-900'
                    )}>
                        {n.title}
                    </p>
                    <span className={cn(
                        'text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0',
                        PRIORITY_STYLES[n.priority]
                    )}>
                        {PRIORITY_LABELS[n.priority]}
                    </span>
                </div>

                <p className="text-[10px] text-slate-400 font-medium leading-relaxed line-clamp-2 italic">
                    {n.body}
                </p>

                <div className="flex items-center justify-between pt-1">
                    <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                        <Zap className="h-2 w-2" />
                        {relativeTime(n.created_at)}
                    </p>
                    {/* Action buttons visible on hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        {!n.is_read && (
                            <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRead(n.id) }}
                                title="Marcar como leída"
                                className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-300 hover:text-indigo-600 transition-colors"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(n.id) }}
                            title="Eliminar"
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )

    if (n.link) {
        return (
            <Link href={n.link} className="block">
                {cardContent}
            </Link>
        )
    }

    return cardContent
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-16 w-16 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                <Bell className="h-7 w-7 text-slate-200" />
            </div>
            <div className="text-center space-y-1">
                <p className="text-sm font-black text-slate-300 uppercase tracking-widest">
                    Sin notificaciones pendientes
                </p>
                <p className="text-[10px] text-slate-200 font-medium italic">
                    Todo en orden. Ejecuta el diagnóstico para verificar alertas.
                </p>
            </div>
        </div>
    )
}

// ─── Tab Button ───────────────────────────────────────────────────────────────

interface TabButtonProps {
    active: boolean
    onClick: () => void
    children: React.ReactNode
    count?: number
}

function TabButton({ active, onClick, children, count }: TabButtonProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'px-4 py-2 text-[10px] font-black uppercase tracking-widest italic rounded-xl transition-all',
                active
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                    : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
            )}
        >
            {children}
            {count !== undefined && count > 0 && (
                <span className={cn(
                    'ml-1.5 text-[8px] px-1.5 py-0.5 rounded-full font-black',
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                )}>
                    {count}
                </span>
            )}
        </button>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TAB_FILTERS: { key: NotificationFilter; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'unread', label: 'Sin leer' },
    { key: 'critical', label: 'Críticas' },
]

export function NotificationCenter({ initialNotifications }: NotificationCenterProps) {
    const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications)
    const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all')
    const [isPending, startTransition] = useTransition()

    // ── Derived counts ──────────────────────────────────────────────────────
    const unreadCount = notifications.filter(n => !n.is_read).length
    const criticalCount = notifications.filter(n => n.priority === 'CRITICAL' || n.priority === 'HIGH').length
    const resolvedCount = notifications.filter(n => n.is_read).length

    // ── Client-side filtering ───────────────────────────────────────────────
    const filteredNotifications = notifications.filter(n => {
        if (activeFilter === 'unread') return !n.is_read
        if (activeFilter === 'critical') return n.priority === 'CRITICAL' || n.priority === 'HIGH'
        return true
    })

    // ── Handlers ────────────────────────────────────────────────────────────

    const handleRead = useCallback((id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        )
        startTransition(async () => {
            const result = await markAsReadAction(id)
            if (!result.success) {
                toast.error('No se pudo marcar como leída')
                setNotifications(prev =>
                    prev.map(n => n.id === id ? { ...n, is_read: false } : n)
                )
            }
        })
    }, [])

    const handleDelete = useCallback((id: string) => {
        const snapshot = notifications.find(n => n.id === id)
        setNotifications(prev => prev.filter(n => n.id !== id))
        startTransition(async () => {
            const result = await deleteNotificationAction(id)
            if (!result.success) {
                toast.error('No se pudo eliminar la notificación')
                if (snapshot) {
                    setNotifications(prev => [snapshot, ...prev])
                }
            }
        })
    }, [notifications])

    const handleMarkAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        startTransition(async () => {
            const result = await markAllAsReadAction()
            if (!result.success) {
                toast.error('Error al marcar todas como leídas')
                setNotifications(initialNotifications)
            } else {
                toast.success('Todas marcadas como leídas')
            }
        })
    }

    const handleDiagnosis = () => {
        startTransition(async () => {
            toast.loading('Ejecutando diagnóstico del sistema...')
            const result = await triggerSystemAlertsAction()
            if (result.success) {
                toast.success('Diagnóstico completado. Revisa las nuevas alertas.')
                window.location.reload()
            } else {
                toast.error(`Error en diagnóstico: ${result.error}`)
            }
        })
    }

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

            {/* Header premium */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 h-20 w-20 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 h-32 w-32 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/50">
                            <Bell className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white italic tracking-tight">
                                Centro de Alertas
                            </h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mt-1 italic">
                                Notificaciones del sistema GVM S.A.S
                            </p>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={handleDiagnosis}
                            disabled={isPending}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest italic rounded-xl transition-colors shadow-lg shadow-indigo-900/50"
                        >
                            <RefreshCw className={cn('h-3.5 w-3.5', isPending && 'animate-spin')} />
                            Diagnóstico
                        </button>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                disabled={isPending}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest italic rounded-xl transition-colors"
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                Todo leído
                            </button>
                        )}
                    </div>
                </div>

                {/* Stat cards */}
                <div className="relative z-10 grid grid-cols-4 gap-3 mt-7">
                    <StatCard
                        label="Total"
                        value={notifications.length}
                        accent="bg-white/5 border-white/10 text-white"
                    />
                    <StatCard
                        label="Sin leer"
                        value={unreadCount}
                        accent="bg-indigo-500/20 border-indigo-400/30 text-indigo-200"
                    />
                    <StatCard
                        label="Críticas"
                        value={criticalCount}
                        accent="bg-rose-500/20 border-rose-400/30 text-rose-200"
                    />
                    <StatCard
                        label="Resueltas"
                        value={resolvedCount}
                        accent="bg-emerald-500/20 border-emerald-400/30 text-emerald-200"
                    />
                </div>
            </div>

            {/* Filters tabs */}
            <div className="flex items-center gap-2 px-1">
                {TAB_FILTERS.map(tab => (
                    <TabButton
                        key={tab.key}
                        active={activeFilter === tab.key}
                        onClick={() => setActiveFilter(tab.key)}
                        count={
                            tab.key === 'unread' ? unreadCount :
                            tab.key === 'critical' ? criticalCount :
                            undefined
                        }
                    >
                        {tab.label}
                    </TabButton>
                ))}

                {unreadCount > 0 && (
                    <div className="ml-auto flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 text-amber-400" />
                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest italic">
                            {unreadCount} pendiente{unreadCount !== 1 ? 's' : ''}
                        </span>
                    </div>
                )}
            </div>

            {/* Notifications list */}
            <div className="space-y-2">
                {filteredNotifications.length === 0 ? (
                    <EmptyState />
                ) : (
                    filteredNotifications.map(n => (
                        <NotificationItem
                            key={n.id}
                            notification={n}
                            onRead={handleRead}
                            onDelete={handleDelete}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
