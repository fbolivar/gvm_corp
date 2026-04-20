'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  Users,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Search,
  Download,
  FileText,
  Activity,
  DollarSign,
  ShieldCheck,
  Sparkles,
  Clock,
  ArrowRight,
  BarChart3,
  FileBarChart,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  suspendTenantAction,
  reactivateTenantAction,
  type TenantRow,
  type PlatformExecMetrics,
  type TenantsTrendRow,
  type TenantRisk,
  type PlatformActivityRow,
  type RiskLevel,
} from '@/features/super-admin/services/superAdminService'
import { NewTenantModal } from './NewTenantModal'

interface Props {
  tenants: TenantRow[]
  execMetrics: PlatformExecMetrics
  trend: TenantsTrendRow[]
  risks: TenantRisk[]
  activity: PlatformActivityRow[]
}

function fmtUSD(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}

function fmtRelative(iso: string): string {
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days} d`
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

export function SuperAdminDashboard({ tenants, execMetrics, trend, risks, activity }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)

  const riskMap = useMemo(() => {
    const m = new Map<string, TenantRisk>()
    risks.forEach(r => m.set(r.tenant_id, r))
    return m
  }, [risks])

  const filtered = useMemo(() => tenants.filter(
    t =>
      t.tenant_name.toLowerCase().includes(search.toLowerCase()) ||
      t.nit?.toLowerCase().includes(search.toLowerCase())
  ), [tenants, search])

  const growth = useMemo(() => {
    if (execMetrics.tenants_created_last_month === 0) {
      return execMetrics.tenants_created_this_month > 0 ? 100 : 0
    }
    return Math.round(
      ((execMetrics.tenants_created_this_month - execMetrics.tenants_created_last_month) /
        execMetrics.tenants_created_last_month) *
        100,
    )
  }, [execMetrics])

  const highRiskCount = risks.filter(r => r.risk_level === 'high').length
  const mediumRiskCount = risks.filter(r => r.risk_level === 'medium').length

  const handleSuspend = async (tenantId: string, tenantName: string) => {
    if (!confirm(`¿Suspender tenant "${tenantName}"? Perderán acceso al sistema.`)) return
    const result = await suspendTenantAction(tenantId)
    if (result.success) {
      toast.success('Tenant suspendido')
      router.refresh()
    } else {
      toast.error(result.error || 'Error')
    }
  }

  const handleReactivate = async (tenantId: string, tenantName: string) => {
    const result = await reactivateTenantAction(tenantId)
    if (result.success) {
      toast.success(`${tenantName} reactivado`)
      router.refresh()
    } else {
      toast.error(result.error || 'Error')
    }
  }

  const handleExportCSV = () => {
    const rows = tenants.map(t => ({
      Tenant: t.tenant_name,
      NIT: t.nit || '',
      Plan: t.license_plan,
      Estado: t.license_status,
      Vigencia: t.license_valid_until || '',
      Riesgo: riskMap.get(t.tenant_id)?.risk_level || 'low',
      MaxUsuarios: t.max_users,
      Usuarios: t.users_count,
      Documentos: t.documents_count,
      Creado: new Date(t.created_at).toLocaleDateString('es-CO'),
    }))
    const headers = Object.keys(rows[0] || {}).join(',')
    const csv = headers + '\n' +
      rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bc-fabric-tenants-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV descargado')
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
      {/* ═══════════ HEADER ═══════════ */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Panel de plataforma
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Observatorio ejecutivo
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Monitoreo en tiempo real de tenants, licencias y salud del negocio.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/super-admin/reports"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <FileBarChart className="w-4 h-4" />
            Reportes
          </Link>
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo tenant
          </button>
        </div>
      </header>

      {/* ═══════════ ALERTA SI HAY RIESGO ═══════════ */}
      {(highRiskCount > 0 || execMetrics.trials_expiring_7d > 0) && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4 flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">Atención requerida</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {highRiskCount > 0 && <>· {highRiskCount} tenant(s) en riesgo alto</>}
              {mediumRiskCount > 0 && <> · {mediumRiskCount} en riesgo medio</>}
              {execMetrics.trials_expiring_7d > 0 && <> · {execMetrics.trials_expiring_7d} trial(s) por vencer en 7d</>}
              {execMetrics.licenses_expiring_7d > 0 && <> · {execMetrics.licenses_expiring_7d} licencia(s) vencen en 7d</>}
            </p>
          </div>
        </div>
      )}

      {/* ═══════════ KPIs PRINCIPALES ═══════════ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          icon={DollarSign}
          label="MRR estimado"
          value={fmtUSD(execMetrics.mrr_estimated)}
          footnote={`ARR proyectado ${fmtUSD(execMetrics.arr_projected)}`}
          tint="emerald"
        />
        <KpiCard
          icon={Building2}
          label="Tenants"
          value={execMetrics.total_tenants.toString()}
          footnote={`${execMetrics.tenants_created_this_month} nuevos este mes`}
          trend={growth}
          tint="sky"
        />
        <KpiCard
          icon={ShieldCheck}
          label="Licencias activas"
          value={execMetrics.active_licenses.toString()}
          footnote={`${execMetrics.expired_licenses} expiradas · ${execMetrics.suspended_tenants} suspendidas`}
          tint="slate"
        />
        <KpiCard
          icon={Sparkles}
          label="Trials activos"
          value={execMetrics.trials_active.toString()}
          footnote={execMetrics.trials_expiring_7d > 0
            ? `${execMetrics.trials_expiring_7d} por vencer en 7d`
            : 'Todos estables'}
          tint={execMetrics.trials_expiring_7d > 0 ? 'amber' : 'slate'}
        />
      </section>

      {/* ═══════════ SPARKLINE + PLAN MIX ═══════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Nuevos tenants</h2>
              <p className="text-xs text-slate-500 mt-0.5">Últimos 6 meses</p>
            </div>
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {trend.reduce((s, t) => s + t.tenants_created, 0)}
            </span>
          </div>
          <Sparkline data={trend} />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Distribución por plan</h2>
          <PlanBar
            label="Enterprise"
            count={execMetrics.plans.enterprise}
            total={execMetrics.total_tenants}
            color="bg-violet-500"
          />
          <PlanBar
            label="Professional"
            count={execMetrics.plans.professional}
            total={execMetrics.total_tenants}
            color="bg-sky-500"
          />
          <PlanBar
            label="Starter"
            count={execMetrics.plans.starter}
            total={execMetrics.total_tenants}
            color="bg-slate-500"
          />
          <PlanBar
            label="Trial"
            count={execMetrics.plans.trial}
            total={execMetrics.total_tenants}
            color="bg-amber-500"
            last
          />
        </div>
      </section>

      {/* ═══════════ TABLA TENANTS + ACTIVIDAD ═══════════ */}
      <section className="grid grid-cols-1 xl:grid-cols-[2.2fr_1fr] gap-4">
        {/* Tabla tenants */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 flex items-center justify-between gap-3 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Tenants</h2>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar nombre o NIT..."
                className="w-56 pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:border-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-left">
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Tenant</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Plan</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Riesgo</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Usuarios</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Docs</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                      No hay tenants que coincidan
                    </td>
                  </tr>
                ) : (
                  filtered.map(t => {
                    const risk = riskMap.get(t.tenant_id)
                    const isSuspended = t.license_status === 'SUSPENDED'
                    return (
                      <tr
                        key={t.tenant_id}
                        className="hover:bg-slate-50/70 cursor-pointer"
                        onClick={() => router.push(`/super-admin/tenants/${t.tenant_id}`)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{t.tenant_name}</div>
                          <div className="text-xs text-slate-500 tabular-nums">{t.nit || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <PlanBadge plan={t.license_plan} />
                        </td>
                        <td className="px-4 py-3">
                          <RiskBadge risk={risk?.risk_level || 'low'} reasons={risk?.reasons || []} />
                        </td>
                        <td className="px-4 py-3 text-slate-700 tabular-nums">
                          {t.users_count}<span className="text-slate-400">/{t.max_users}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 tabular-nums">{t.documents_count}</td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 justify-end">
                            {isSuspended ? (
                              <button
                                type="button"
                                onClick={() => handleReactivate(t.tenant_id, t.tenant_name)}
                                className="text-xs font-medium text-emerald-700 hover:text-emerald-900 px-2 py-1 rounded"
                              >
                                Reactivar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSuspend(t.tenant_id, t.tenant_name)}
                                className="text-xs font-medium text-rose-600 hover:text-rose-800 px-2 py-1 rounded"
                              >
                                Suspender
                              </button>
                            )}
                            <Link
                              href={`/super-admin/tenants/${t.tenant_id}`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-slate-900 hover:text-slate-700 px-2 py-1 rounded"
                            >
                              Ver <ArrowRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actividad reciente */}
        <aside className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-500" />
              <h2 className="text-base font-semibold text-slate-900">Actividad reciente</h2>
            </div>
            <span className="text-xs text-slate-500">{activity.length} eventos</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
            {activity.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">Sin actividad reciente</p>
            ) : (
              activity.map(a => (
                <div key={a.log_id} className="px-4 py-3 hover:bg-slate-50/60">
                  <div className="flex items-start gap-2">
                    <ActionDot action={a.action} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-900 font-medium truncate">
                        <span className="text-slate-600">{a.actor_name || 'Sistema'}</span>
                        <span className="text-slate-400"> · </span>
                        <span className="text-slate-700">{actionLabel(a.action, a.entity)}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {a.tenant_name || '—'} · <span className="tabular-nums">{fmtRelative(a.created_at)}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>

      {showNewModal && (
        <NewTenantModal onClose={() => setShowNewModal(false)} onSuccess={() => router.refresh()} />
      )}
    </div>
  )
}

// ═══════════ SUB-COMPONENTS ═══════════

function KpiCard({
  icon: Icon,
  label,
  value,
  footnote,
  trend,
  tint = 'slate',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  footnote?: string
  trend?: number
  tint?: 'emerald' | 'sky' | 'slate' | 'amber'
}) {
  const tints = {
    emerald: 'bg-emerald-50 text-emerald-700',
    sky: 'bg-sky-50 text-sky-700',
    slate: 'bg-slate-50 text-slate-700',
    amber: 'bg-amber-50 text-amber-700',
  }
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${tints[tint]}`}>
          <Icon className="w-4 h-4" />
        </div>
        {trend !== undefined && trend !== 0 && (
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
              trend > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
            }`}
          >
            {trend > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl md:text-3xl font-bold text-slate-900 tabular-nums mt-1 truncate">{value}</p>
      {footnote && <p className="text-[11px] text-slate-500 mt-1 truncate">{footnote}</p>}
    </div>
  )
}

function Sparkline({ data }: { data: TenantsTrendRow[] }) {
  const max = Math.max(1, ...data.map(d => d.tenants_created))
  const padding = 4
  const width = 100
  const height = 40
  const stepX = (width - padding * 2) / Math.max(1, data.length - 1)
  const points = data.map((d, i) => {
    const x = padding + i * stepX
    const y = height - padding - (d.tenants_created / max) * (height - padding * 2)
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke="#0f172a"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {data.map((d, i) => {
          const x = padding + i * stepX
          const y = height - padding - (d.tenants_created / max) * (height - padding * 2)
          return <circle key={i} cx={x} cy={y} r="1.2" fill="#0f172a" vectorEffect="non-scaling-stroke" />
        })}
      </svg>
      <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
        {data.map((d, i) => (
          <span key={i} className="tabular-nums">
            {d.month_label}: <strong className="text-slate-600">{d.tenants_created}</strong>
          </span>
        ))}
      </div>
    </div>
  )
}

function PlanBar({
  label,
  count,
  total,
  color,
  last,
}: {
  label: string
  count: number
  total: number
  color: string
  last?: boolean
}) {
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

function RiskBadge({ risk, reasons }: { risk: RiskLevel; reasons: string[] }) {
  const cfg: Record<RiskLevel, { label: string; cls: string; dot: string }> = {
    high: { label: 'Alto', cls: 'bg-rose-50 text-rose-700 ring-rose-200/60', dot: 'bg-rose-500' },
    medium: { label: 'Medio', cls: 'bg-amber-50 text-amber-700 ring-amber-200/60', dot: 'bg-amber-500' },
    low: { label: 'Bajo', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60', dot: 'bg-emerald-500' },
  }
  const c = cfg[risk]
  const tooltip = reasons.length > 0 ? reasons.join(' · ') : 'Saludable'
  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ring-1 ${c.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  )
}

function ActionDot({ action }: { action: string }) {
  const map: Record<string, string> = {
    CREATE: 'bg-emerald-400',
    INSERT: 'bg-emerald-400',
    UPDATE: 'bg-sky-400',
    DELETE: 'bg-rose-400',
  }
  return <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${map[action] || 'bg-slate-400'}`} />
}

function actionLabel(action: string, entity: string): string {
  const aMap: Record<string, string> = {
    CREATE: 'creó',
    INSERT: 'creó',
    UPDATE: 'actualizó',
    DELETE: 'eliminó',
  }
  const eMap: Record<string, string> = {
    tenants: 'tenant',
    tenant_licenses: 'licencia',
    documents: 'documento',
    employees: 'empleado',
    parties: 'tercero',
    products: 'producto',
  }
  return `${aMap[action] || action.toLowerCase()} ${eMap[entity] || entity}`
}
