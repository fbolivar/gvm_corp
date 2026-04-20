'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Download,
  FileText,
  DollarSign,
  Building2,
  Ban,
  TrendingUp,
  Printer,
} from 'lucide-react'
import type { PlatformReport } from '@/features/super-admin/services/superAdminService'
import { toast } from 'sonner'

interface Props {
  initialReport: PlatformReport
  initialFrom: string
  initialTo: string
  initialPlan: string | null
  initialStatus: string | null
}

const PLANS = ['ENTERPRISE', 'PROFESSIONAL', 'STARTER', 'TRIAL']
const STATUSES = ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED']

const PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: 'Este año', special: 'ytd' as const },
]

function fmtUSD(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ReportsClient({ initialReport, initialFrom, initialTo, initialPlan, initialStatus }: Props) {
  const router = useRouter()
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [plan, setPlan] = useState<string>(initialPlan || '')
  const [status, setStatus] = useState<string>(initialStatus || '')

  const report = initialReport

  const applyPreset = (preset: typeof PRESETS[number]) => {
    const today = new Date()
    let start: Date
    if ('special' in preset && preset.special === 'ytd') {
      start = new Date(today.getFullYear(), 0, 1)
    } else {
      start = new Date()
      start.setDate(today.getDate() - ((preset as { days: number }).days))
    }
    const f = start.toISOString().slice(0, 10)
    const t = today.toISOString().slice(0, 10)
    setFrom(f)
    setTo(t)
    navigate(f, t, plan, status)
  }

  const navigate = (f: string, t: string, p: string, s: string) => {
    const qs = new URLSearchParams()
    qs.set('from', f)
    qs.set('to', t)
    if (p) qs.set('plan', p)
    if (s) qs.set('status', s)
    router.push(`/super-admin/reports?${qs.toString()}`)
  }

  const maxDailyCount = useMemo(
    () => Math.max(1, ...report.daily_series.map(d => d.count)),
    [report.daily_series],
  )

  const handleCsv = () => {
    const rows = report.tenants.map(t => ({
      Tenant: t.tenant_name,
      NIT: t.nit || '',
      Plan: t.plan || '—',
      Estado: t.status || '—',
      Vigencia: t.valid_until || '',
      MRR_USD: t.mrr_usd,
      MaxUsuarios: t.max_users,
      Usuarios: t.users_count,
      Creado: new Date(t.created_at).toISOString().slice(0, 10),
    }))
    if (rows.length === 0) return toast.error('Sin datos para exportar')
    const headers = Object.keys(rows[0]).join(',')
    const csv = headers + '\n' +
      rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bc-fabric-reporte-${from}_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV descargado')
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto print:p-0 print:max-w-full">
      {/* ═══ HEADER ═══ */}
      <header className="mb-6 print:hidden">
        <Link
          href="/super-admin"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver al panel
        </Link>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Inteligencia de plataforma
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Reportes ejecutivos</h1>
            <p className="text-sm text-slate-500 mt-1">
              Análisis por período, plan y estado de licencia.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Printer className="w-4 h-4" /> Imprimir / PDF
            </button>
            <button
              type="button"
              onClick={handleCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>
        </div>
      </header>

      {/* ═══ FILTROS ═══ */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 mb-6 print:hidden">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1">
            {PRESETS.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <label htmlFor="rep-from" className="block text-[11px] font-medium text-slate-600 mb-1">Desde</label>
            <input
              id="rep-from"
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="h-9 border border-slate-200 rounded-lg px-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="rep-to" className="block text-[11px] font-medium text-slate-600 mb-1">Hasta</label>
            <input
              id="rep-to"
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="h-9 border border-slate-200 rounded-lg px-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="rep-plan" className="block text-[11px] font-medium text-slate-600 mb-1">Plan</label>
            <select
              id="rep-plan"
              value={plan}
              onChange={e => setPlan(e.target.value)}
              className="h-9 border border-slate-200 rounded-lg px-2 text-sm bg-white focus:border-slate-400 focus:outline-none"
            >
              <option value="">Todos</option>
              {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="rep-status" className="block text-[11px] font-medium text-slate-600 mb-1">Estado</label>
            <select
              id="rep-status"
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="h-9 border border-slate-200 rounded-lg px-2 text-sm bg-white focus:border-slate-400 focus:outline-none"
            >
              <option value="">Todos</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button
            type="button"
            onClick={() => navigate(from, to, plan, status)}
            className="h-9 px-4 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
          >
            Aplicar
          </button>
        </div>
      </section>

      {/* Período activo (print-only) */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">BC Fabric · Reporte de plataforma</h1>
        <p className="text-sm text-slate-600 mt-1">
          Período: {fmtDate(from)} — {fmtDate(to)}
          {plan && <> · Plan: {plan}</>}
          {status && <> · Estado: {status}</>}
        </p>
      </div>

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiBox icon={Building2} label="Nuevos tenants" value={report.new_tenants} />
        <KpiBox icon={DollarSign} label="MRR snapshot" value={fmtUSD(report.revenue_mrr_snapshot)} />
        <KpiBox icon={TrendingUp} label="Licencias activadas" value={report.new_licenses} />
        <KpiBox icon={Ban} label="Suspensiones" value={report.suspended_in_range} />
      </section>

      {/* ═══ GRÁFICAS ═══ */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            Nuevos tenants por día
          </h2>
          {report.daily_series.length === 0 ? (
            <p className="text-sm text-slate-400 py-10 text-center">Sin datos en el período</p>
          ) : (
            <DailyBars data={report.daily_series} maxCount={maxDailyCount} />
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Distribución por plan</h2>
          {['enterprise', 'professional', 'starter', 'trial'].map((key, idx) => {
            const count = (report.plan_distribution as Record<string, number>)[key] || 0
            const total = report.new_tenants || 1
            return (
              <PlanBar
                key={key}
                label={key.charAt(0).toUpperCase() + key.slice(1)}
                count={count}
                total={total}
                color={
                  key === 'enterprise' ? 'bg-violet-500' :
                  key === 'professional' ? 'bg-sky-500' :
                  key === 'starter' ? 'bg-slate-500' : 'bg-amber-500'
                }
                last={idx === 3}
              />
            )
          })}
        </div>
      </section>

      {/* ═══ TABLA TENANTS DEL RANGO ═══ */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Tenants creados en el período</h2>
          <span className="text-xs text-slate-500">{report.tenants.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-left">
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Tenant</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Plan</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Vigencia</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide text-right">MRR</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Usuarios</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                    Sin tenants en el período/filtros seleccionados
                  </td>
                </tr>
              ) : (
                report.tenants.map(t => (
                  <tr key={t.tenant_id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5">
                      <Link href={`/super-admin/tenants/${t.tenant_id}`} className="font-medium text-slate-900 hover:text-slate-700">
                        {t.tenant_name}
                      </Link>
                      <p className="text-xs text-slate-500">{t.nit || '—'}</p>
                    </td>
                    <td className="px-4 py-2.5"><PlanBadge plan={t.plan || 'NONE'} /></td>
                    <td className="px-4 py-2.5 text-xs text-slate-700">{t.status || '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-700">{fmtDate(t.valid_until || '')}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-900 font-medium text-right tabular-nums">
                      {fmtUSD(t.mrr_usd)}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-700 tabular-nums">
                      {t.users_count}<span className="text-slate-400">/{t.max_users ?? 0}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{fmtDate(t.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {report.tenants.length > 0 && (
              <tfoot className="bg-slate-50/60 border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-slate-700 uppercase tracking-wide">Total MRR</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-slate-900 text-right tabular-nums">
                    {fmtUSD(report.tenants.reduce((s, t) => s + (t.mrr_usd || 0), 0))}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <p className="text-[11px] text-slate-400 mt-6 print:mt-10">
        <FileText className="w-3 h-3 inline mr-1" />
        Reporte generado el {new Date().toLocaleString('es-CO')} · BC Fabric SAS · Confidencial
      </p>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  )
}

// Sub-components
function KpiBox({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  )
}

function DailyBars({ data, maxCount }: { data: { date: string; count: number }[]; maxCount: number }) {
  return (
    <div className="flex items-end gap-1 h-32 w-full">
      {data.map(d => {
        const pct = (d.count / maxCount) * 100
        return (
          <div
            key={d.date}
            className="flex-1 group relative flex items-end"
            title={`${d.date}: ${d.count} tenant(s)`}
          >
            {/* eslint-disable-next-line react/forbid-dom-props */}
            <div className="w-full rounded-t bg-slate-900 hover:bg-slate-700 transition-colors" style={{ height: `${pct}%` }} />
          </div>
        )
      })}
    </div>
  )
}

function PlanBar({
  label, count, total, color, last,
}: { label: string; count: number; total: number; color: string; last?: boolean }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className={last ? '' : 'mb-3'}>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-slate-700">{label}</span>
        <span className="text-xs font-semibold text-slate-900 tabular-nums">{count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        {/* eslint-disable-next-line react/forbid-dom-props */}
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, string> = {
    ENTERPRISE: 'bg-violet-50 text-violet-700 ring-violet-200/60',
    PROFESSIONAL: 'bg-sky-50 text-sky-700 ring-sky-200/60',
    STARTER: 'bg-slate-50 text-slate-700 ring-slate-200/60',
    TRIAL: 'bg-amber-50 text-amber-700 ring-amber-200/60',
    NONE: 'bg-rose-50 text-rose-700 ring-rose-200/60',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium ring-1 ${map[plan] || map.NONE}`}>
      {plan}
    </span>
  )
}
