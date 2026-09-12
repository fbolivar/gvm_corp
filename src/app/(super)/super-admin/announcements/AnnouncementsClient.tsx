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
  X,
  Pencil,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  createAnnouncementAction,
  updateAnnouncementAction,
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

// Estilos idénticos al banner real que ve el usuario en la app (AnnouncementsBanner).
const bannerCls: Record<Announcement['severity'], string> = {
  info: 'bg-sky-50 border-sky-200 text-sky-900',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  critical: 'bg-rose-50 border-rose-200 text-rose-900',
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function AnnouncementsClient({ initialAnnouncements }: { initialAnnouncements: Announcement[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  // null = creando; string = editando ese anuncio
  const [editingId, setEditingId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [severity, setSeverity] = useState<Announcement['severity']>('info')
  const [targetPlans, setTargetPlans] = useState<string[]>([])
  const [expiresAt, setExpiresAt] = useState('')

  const togglePlan = (p: string) => {
    setTargetPlans(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  const resetForm = () => {
    setTitle(''); setBody(''); setSeverity('info'); setTargetPlans([]); setExpiresAt('')
    setEditingId(null); setShowForm(false)
  }

  // Convierte un timestamp (fin de día Bogotá) a 'YYYY-MM-DD' local para el input date.
  const toDateInput = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }) : ''

  const startEdit = (a: Announcement) => {
    setEditingId(a.id)
    setTitle(a.title)
    setBody(a.body)
    setSeverity(a.severity)
    setTargetPlans(a.target_plans ?? [])
    setExpiresAt(toDateInput(a.expires_at))
    setShowForm(true)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return toast.error('Título y mensaje requeridos')
    setLoading(true)
    const payload = {
      title: title.trim(),
      body: body.trim(),
      severity,
      target_plans: targetPlans.length > 0 ? targetPlans : null,
      expires_at: expiresAt || null,
    }
    const res = editingId
      ? await updateAnnouncementAction(editingId, payload)
      : await createAnnouncementAction(payload)
    setLoading(false)
    if (!res.success) {
      const raw = res.error || 'Error desconocido'
      const permiso = /permission|policy|row-level|denied|platform admin/i.test(raw)
      return toast.error(
        permiso
          ? 'No se pudo guardar: tu cuenta no tiene permisos de Platform Admin.'
          : `No se pudo guardar el anuncio: ${raw}`
      )
    }
    toast.success(editingId ? '✅ Anuncio actualizado' : '✅ Anuncio publicado', {
      description: targetPlans.length > 0
        ? `Visible para planes: ${targetPlans.join(', ')}.`
        : 'Visible para todos los planes.',
    })
    resetForm()
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
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Cancelar' : 'Nuevo anuncio'}
        </button>
      </header>

      {showForm && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            {editingId ? 'Editar anuncio' : 'Crear anuncio'}
          </h2>
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

            {/* Vista previa: así se verá el banner en la app del usuario */}
            <div>
              <span className="block text-xs font-medium text-slate-600 mb-1">Vista previa (como lo verá el usuario)</span>
              {(() => {
                const PreviewIcon = severityMeta[severity].Icon
                return (
                  <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${bannerCls[severity]}`}>
                    <PreviewIcon className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{title.trim() || 'Título del anuncio'}</p>
                      <p className="text-xs mt-0.5 whitespace-pre-line opacity-90">{body.trim() || 'El mensaje del anuncio aparecerá aquí.'}</p>
                    </div>
                    <X className="w-3.5 h-3.5 shrink-0 opacity-50" />
                  </div>
                )
              })()}
              <p className="text-[10px] text-slate-400 mt-1">
                Aparece arriba del contenido en la app de los usuarios (no en esta consola). Cada usuario puede descartarlo con la X.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {loading
                  ? (editingId ? 'Guardando...' : 'Publicando...')
                  : (editingId ? 'Guardar cambios' : 'Publicar anuncio')}
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
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(a)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Editar anuncio"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(a.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Eliminar anuncio"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}
