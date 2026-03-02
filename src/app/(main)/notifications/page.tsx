import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getNotificationsAction } from '@/features/notifications/actions'
import { NotificationCenter } from '@/features/notifications/components/NotificationCenter'

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function NotificationsSkeleton() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 animate-pulse">
            {/* Header skeleton */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 space-y-6">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 bg-white/10 rounded-2xl" />
                    <div className="space-y-2">
                        <div className="h-6 w-48 bg-white/10 rounded-lg" />
                        <div className="h-3 w-32 bg-white/5 rounded-lg" />
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-16 bg-white/5 rounded-2xl border border-white/10" />
                    ))}
                </div>
            </div>

            {/* Filter tabs skeleton */}
            <div className="flex gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-8 w-20 bg-slate-100 rounded-xl" />
                ))}
            </div>

            {/* Items skeleton */}
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-4 bg-white border border-slate-100 rounded-2xl">
                    <div className="h-10 w-10 bg-slate-100 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 bg-slate-100 rounded" />
                        <div className="h-2 w-full bg-slate-50 rounded" />
                        <div className="h-2 w-1/3 bg-slate-50 rounded" />
                    </div>
                </div>
            ))}
        </div>
    )
}

// ─── Page Content (async) ─────────────────────────────────────────────────────

async function NotificationsPageContent() {
    const { data: notifications } = await getNotificationsAction('all')

    return <NotificationCenter initialNotifications={notifications} />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
    return (
        <main className="min-h-screen bg-slate-50">
            <Suspense fallback={<NotificationsSkeleton />}>
                <NotificationsPageContent />
            </Suspense>
        </main>
    )
}

export const metadata: Metadata = {
    title: 'Centro de Alertas | GVM S.A.S',
    description: 'Notificaciones y alertas del sistema ERP',
}
