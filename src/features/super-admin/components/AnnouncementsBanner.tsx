"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, Info, CheckCircle2, AlertCircle, X } from 'lucide-react'

interface ActiveAnnouncement {
  id: string
  title: string
  body: string
  severity: 'info' | 'warning' | 'critical' | 'success'
  published_at: string
  expires_at: string | null
}

const meta: Record<ActiveAnnouncement['severity'], { cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  info: { cls: 'bg-sky-50 border-sky-200 text-sky-900', Icon: Info },
  success: { cls: 'bg-emerald-50 border-emerald-200 text-emerald-900', Icon: CheckCircle2 },
  warning: { cls: 'bg-amber-50 border-amber-200 text-amber-900', Icon: AlertTriangle },
  critical: { cls: 'bg-rose-50 border-rose-200 text-rose-900', Icon: AlertCircle },
}

/**
 * Banner de anuncios de plataforma. Se muestra en el layout principal.
 * Consulta get_active_announcements() (filtra por plan del tenant + no descartados).
 * Cada anuncio tiene botón X que llama dismiss_announcement(id).
 */
export function AnnouncementsBanner() {
  const [items, setItems] = useState<ActiveAnnouncement[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.rpc('get_active_announcements').then((res: { data: ActiveAnnouncement[] | null; error: unknown }) => {
      if (!res.error && res.data) setItems(res.data)
      setLoaded(true)
    })
  }, [])

  const dismiss = async (id: string) => {
    // Optimistic
    setItems(prev => prev.filter(i => i.id !== id))
    const supabase = createClient()
    await supabase.rpc('dismiss_announcement', { p_id: id })
  }

  if (!loaded || items.length === 0) return null

  return (
    <div className="space-y-2 mb-4">
      {items.map(a => {
        const m = meta[a.severity]
        const Icon = m.Icon
        return (
          <div
            key={a.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${m.cls}`}
          >
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{a.title}</p>
              <p className="text-xs mt-0.5 whitespace-pre-line opacity-90">{a.body}</p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(a.id)}
              className="shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
              title="Descartar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
