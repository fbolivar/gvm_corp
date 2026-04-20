'use client'

import { useMemo, useState } from 'react'
import { Send, Users, Mail, Info, Copy, CheckCircle2, Download } from 'lucide-react'
import { toast } from 'sonner'
import type { BroadcastRecipient } from '@/features/super-admin/services/superAdminService'

const PLANS = ['ENTERPRISE', 'PROFESSIONAL', 'STARTER', 'TRIAL']
const STATUSES = ['ACTIVE', 'EXPIRED', 'SUSPENDED']

export function BroadcastClient({ initialRecipients }: { initialRecipients: BroadcastRecipient[] }) {
  const [filterPlans, setFilterPlans] = useState<string[]>([])
  const [filterStatuses, setFilterStatuses] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [copied, setCopied] = useState(false)

  const filtered = useMemo(() => {
    return initialRecipients.filter(r =>
      (filterPlans.length === 0 || (r.plan && filterPlans.includes(r.plan))) &&
      (filterStatuses.length === 0 || (r.status && filterStatuses.includes(r.status)))
    )
  }, [initialRecipients, filterPlans, filterStatuses])

  const uniqueEmails = useMemo(() => {
    const set = new Set<string>()
    filtered.forEach(r => { if (r.admin_email) set.add(r.admin_email) })
    return Array.from(set)
  }, [filtered])

  const togglePlan = (p: string) => setFilterPlans(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  const toggleStatus = (s: string) => setFilterStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const handleCopyEmails = async () => {
    if (uniqueEmails.length === 0) return toast.error('Sin destinatarios')
    try {
      await navigator.clipboard.writeText(uniqueEmails.join(', '))
      setCopied(true)
      toast.success(`${uniqueEmails.length} correos copiados al portapapeles`)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Error copiando')
    }
  }

  const handleMailto = () => {
    if (uniqueEmails.length === 0) return toast.error('Sin destinatarios')
    if (uniqueEmails.length > 40) {
      // mailto con demasiados recipients puede fallar, mejor BCC vía copy
      toast.error('Demasiados destinatarios para mailto. Usa "Copiar BCC" y pega en tu cliente de correo.')
      return
    }
    const bcc = uniqueEmails.join(',')
    const url = `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = url
  }

  const handleCsv = () => {
    if (filtered.length === 0) return toast.error('Sin datos')
    const rows = filtered.map(r => ({
      Tenant: r.tenant_name,
      Plan: r.plan || '—',
      Estado: r.status || '—',
      Admin: r.admin_full_name || '—',
      Email: r.admin_email,
    }))
    const headers = Object.keys(rows[0]).join(',')
    const csv = headers + '\n' +
      rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bc-fabric-destinatarios-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV descargado')
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
      <header className="mb-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Comunicación</p>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Send className="w-6 h-6 text-slate-700" />
          Comunicados a administradores
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Filtra los administradores de tenants por plan y estado, prepara un borrador y envía por BCC desde tu cliente de correo.
        </p>
      </header>

      {/* Info tip */}
      <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Info className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-900">
          Este flujo compila la lista de destinatarios y abre tu cliente de correo con el mensaje
          prellenado en <strong>BCC</strong> (para privacidad). Para envíos muy grandes (&gt;40) usa
          &quot;Copiar BCC&quot; y pega en una herramienta dedicada (Mailgun, Resend, etc.).
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-4">
        {/* FILTROS + COMPOSER */}
        <section className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Filtrar destinatarios</h2>

            <div className="space-y-4">
              <div>
                <span className="block text-xs font-medium text-slate-600 mb-2" id="bc-plans">Planes</span>
                <div className="flex flex-wrap gap-1.5" aria-labelledby="bc-plans">
                  {PLANS.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlan(p)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                        filterPlans.includes(p)
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-600 mb-2" id="bc-status">Estado de licencia</span>
                <div className="flex flex-wrap gap-1.5" aria-labelledby="bc-status">
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleStatus(s)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                        filterStatuses.includes(s)
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-700 tabular-nums">
                    <strong>{uniqueEmails.length}</strong> correo{uniqueEmails.length === 1 ? '' : 's'} únicos
                  </span>
                </div>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500">{filtered.length} admin(s)</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Borrador</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="bc-subj" className="block text-xs font-medium text-slate-600 mb-1">Asunto</label>
                <input
                  id="bc-subj"
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Nueva funcionalidad disponible en BC Fabric..."
                  className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="bc-body" className="block text-xs font-medium text-slate-600 mb-1">Mensaje</label>
                <textarea
                  id="bc-body"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={6}
                  placeholder="Hola,&#10;&#10;Queremos informarte que..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-slate-400 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={handleCopyEmails}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                Copiar BCC
              </button>
              <button
                type="button"
                onClick={handleCsv}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
              <button
                type="button"
                onClick={handleMailto}
                disabled={uniqueEmails.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-50 ml-auto"
              >
                <Mail className="w-3.5 h-3.5" />
                Abrir en correo
              </button>
            </div>
          </div>
        </section>

        {/* PREVIEW DESTINATARIOS */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Destinatarios filtrados</h2>
            <span className="text-xs text-slate-500">{filtered.length} admin(s)</span>
          </div>
          <div className="overflow-x-auto max-h-[640px]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide text-left">Tenant</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide text-left">Plan</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide text-left">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-slate-400">
                    Sin destinatarios con los filtros actuales
                  </td></tr>
                ) : (
                  filtered.map((r, idx) => (
                    <tr key={`${r.tenant_id}-${r.admin_user_id}-${idx}`} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-900">{r.tenant_name}</p>
                        <p className="text-[11px] text-slate-500">{r.status || '—'}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                          {r.plan || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-slate-900">{r.admin_full_name || r.admin_email}</p>
                        <p className="text-[11px] text-slate-500">{r.admin_email}</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
