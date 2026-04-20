'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Megaphone,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
  type Announcement,
} from '@/features/super-admin/services/superAdminService'

const PLANS = ['ENTERPRISE', 'PROFESSIONAL', 'STARTER', 'TRIAL']
const SEVERITIES: Announcement['severity'][] = ['info', 'success', 'warning', 'critical']

const severityMeta: Record<Announcement['severity'], { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  info: { label: 'Info', cls: 'bg-sky-50 text-sky-700 ring-sky-200/60', Icon: Info },
  success: { label: 'Éxito', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60', Icon: CheckCircle2 },
  warning: { label: 'Advertencia', cls: 'bg-amber-50 text-amber-700 ring-amber-200/60', Icon: AlertTriangle },
  critical: { label: 'Crítico', cls: 'bg-rose-50 text-rose-700 ring-rose-200/60', Icon: AlertCircle },
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function AnnouncementsClient({ initialAnnouncements }: { initialAnnouncements: Announcement[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [severity, setSeverity] = useState<Announcement['severity']>('info')
  const [targetPlans, setTargetPlans] = useState<string[]>([])
  const [expiresAt, setExpiresAt] = useState('')

  const togglePlan = (p: string) => {
    setTargetPlans(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) return toast.error('Título y mensaje requeridos')
    setLoading(true)
    const res = await createAnnouncementAction({
      title: title.trim(),
      body: body.trim(),
      severity,
      target_plans: targetPlans.length > 0 ? targetPlans : null,
      expires_at: expiresAt || null,
    })
    setLoading(false)
    if (!res.success) return toast.error(res.error || 'Error al crear')
    toast.success('Anuncio publicado')
    setTitle(''); setBody(''); setSeverity('info'); setTargetPlans([]); setExpiresAt('')
    setShowForm(false)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este anuncio? Dejará de mostrarse a todos los tenants.')) return
    const res = await deleteAnnouncementAction(id)
    if (!res.success) return toast.error(res.error || 'Error')
    toast.success('Anuncio eliminado')
    router.refresh()
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1200px] mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Comunicación</p>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-slate-700" />
            Anuncios
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Mensajes que verán los usuarios de los tenants en su app, filtrados por plan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(s => !s)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Cancelar' : 'Nuevo anuncio'}
        </button>
      </header>

      {showForm && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Crear anuncio</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="ann-title" className="block text-xs font-medium text-slate-600 mb-1">Título</label>
              <input
                id="ann-title"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Mantenimiento programado el sábado"
                className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="ann-body" className="block text-xs font-medium text-slate-600 mb-1">Mensaje</label>
              <textarea
                id="ann-body"
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={3}
                placeholder="Detalle del anuncio..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-slate-400 focus:outline-none resize-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="ann-sev" className="block text-xs font-medium text-slate-600 mb-1">Severidad</label>
                <select
                  id="ann-sev"
                  value={severity}
                  onChange={e => setSeverity(e.target.value as Announcement['severity'])}
                  className="w-full h-10 border border-slate-200 rounded-lg px-2 text-sm bg-white focus:border-slate-400 focus:outline-none"
                >
                  {SEVERITIES.map(s => (
                    <option key={s} value={s}>{severityMeta[s].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ann-exp" className="block text-xs font-medium text-slate-600 mb-1">Expira (opcional)</label>
                <input
                  id="ann-exp"
                  type="date"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  className="w-full h-10 border border-slate-200 rounded-lg px-2 text-sm focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <span id="plan-label" className="block text-xs font-medium text-slate-600 mb-1">Planes objetivo</span>
                <div className="flex flex-wrap gap-1.5" aria-labelledby="plan-label">
                  {PLANS.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlan(p)}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium border ${
                        targetPlans.includes(p)
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Vacío = todos los planes</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? 'Publicando...' : 'Publicar anuncio'}
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="space-y-3">
        {initialAnnouncements.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No hay anuncios publicados todavía.</p>
          </div>
        ) : (
          initialAnnouncements.map(a => {
            const sev = severityMeta[a.severity]
            const { Icon } = sev
            const expired = a.expires_at && new Date(a.expires_at) < new Date()
            return (
              <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${sev.cls.replace('ring-1', '')}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">{a.title}</h3>
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-medium ring-1 ${sev.cls}`}>
                          {sev.label}
                        </span>
                        {expired && (
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500">
                            Expirado
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 mt-1 whitespace-pre-line">{a.body}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2 flex-wrap">
                        <span>Publicado: {fmtDate(a.published_at)}</span>
                        {a.expires_at && <span>Expira: {fmtDate(a.expires_at)}</span>}
                        {a.target_plans && a.target_plans.length > 0 && (
                          <span>Planes: {a.target_plans.join(', ')}</span>
                        )}
                        {(!a.target_plans || a.target_plans.length === 0) && (
                          <span>Todos los planes</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                    title="Eliminar anuncio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}
