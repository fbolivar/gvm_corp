'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  Plus,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Search,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  suspendTenantAction,
  reactivateTenantAction,
  type TenantRow,
  type PlatformMetrics,
} from '@/features/super-admin/services/superAdminService'
import { NewTenantModal } from './NewTenantModal'

interface Props {
  tenants: TenantRow[]
  metrics: PlatformMetrics
}

export function SuperAdminDashboard({ tenants: initialTenants, metrics }: Props) {
  const router = useRouter()
  const [tenants] = useState(initialTenants)
  const [search, setSearch] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)

  const filtered = tenants.filter(
    t =>
      t.tenant_name.toLowerCase().includes(search.toLowerCase()) ||
      t.nit?.toLowerCase().includes(search.toLowerCase())
  )

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

  return (
    <div className="p-6 md:p-10">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-10">
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
          Gestión de la Plataforma
        </h1>
        <p className="text-sm text-slate-500 mt-2 font-medium max-w-2xl">
          Controla todos los tenants, licencias y métricas globales de BC Fabric SAS.
        </p>
      </div>

      {/* Metrics */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        <MetricCard
          icon={Building2}
          label="Total Tenants"
          value={metrics.total_tenants}
          color="bg-blue-100 text-blue-700"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Licencias Activas"
          value={metrics.active_licenses}
          color="bg-emerald-100 text-emerald-700"
        />
        <MetricCard
          icon={XCircle}
          label="Licencias Expiradas"
          value={metrics.expired_licenses}
          color="bg-red-100 text-red-700"
        />
        <MetricCard
          icon={Users}
          label="Usuarios Totales"
          value={metrics.total_users}
          color="bg-purple-100 text-purple-700"
        />
        <MetricCard
          icon={TrendingUp}
          label="Nuevos Este Mes"
          value={metrics.tenants_created_this_month}
          color="bg-amber-100 text-amber-700"
        />
      </div>

      {/* Plan breakdown */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <PlanCard label="Enterprise" count={metrics.plans.enterprise} color="purple" />
        <PlanCard label="Professional" count={metrics.plans.professional} color="blue" />
        <PlanCard label="Starter" count={metrics.plans.starter} color="slate" />
        <PlanCard label="Trial" count={metrics.plans.trial} color="amber" />
      </div>

      {/* Tenants table */}
      <div className="max-w-7xl mx-auto bg-white border-2 border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-6 flex items-center justify-between gap-4 border-b-2 border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o NIT..."
              className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Nuevo Tenant
          </button>
        </div>

        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-6 py-3 text-xs font-black uppercase tracking-wide text-slate-600">Tenant</th>
              <th className="px-6 py-3 text-xs font-black uppercase tracking-wide text-slate-600">NIT</th>
              <th className="px-6 py-3 text-xs font-black uppercase tracking-wide text-slate-600">Plan</th>
              <th className="px-6 py-3 text-xs font-black uppercase tracking-wide text-slate-600">Licencia</th>
              <th className="px-6 py-3 text-xs font-black uppercase tracking-wide text-slate-600">Vence</th>
              <th className="px-6 py-3 text-xs font-black uppercase tracking-wide text-slate-600">Users</th>
              <th className="px-6 py-3 text-xs font-black uppercase tracking-wide text-slate-600">Docs</th>
              <th className="px-6 py-3 text-xs font-black uppercase tracking-wide text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-400 text-sm">
                  No hay tenants que coincidan
                </td>
              </tr>
            ) : (
              filtered.map(t => {
                const isExpired = t.license_valid_until
                  ? new Date(t.license_valid_until) < new Date()
                  : false
                const isSuspended = t.license_status === 'SUSPENDED'
                return (
                  <tr
                    key={t.tenant_id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => router.push(`/super-admin/tenants/${t.tenant_id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 group">
                        <Link
                          href={`/super-admin/tenants/${t.tenant_id}`}
                          onClick={e => e.stopPropagation()}
                          className="hover:text-purple-700 transition-colors"
                        >
                          {t.tenant_name}
                        </Link>
                        <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-purple-500 transition-colors" />
                      </div>
                      <div className="text-xs text-slate-500">
                        Creado: {new Date(t.created_at).toLocaleDateString('es-CO')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 font-mono">{t.nit || '—'}</td>
                    <td className="px-6 py-4">
                      <PlanBadge plan={t.license_plan} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={t.license_status} isExpired={isExpired} />
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {t.license_valid_until ? (
                        <span className={isExpired ? 'text-red-600 font-bold' : 'text-slate-700'}>
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {new Date(t.license_valid_until).toLocaleDateString('es-CO')}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {t.users_count} / {t.max_users}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{t.documents_count}</td>
                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/super-admin/tenants/${t.tenant_id}`}
                          className="text-xs font-bold text-purple-700 hover:text-purple-900 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                        >
                          Ver
                        </Link>
                        {isSuspended ? (
                          <button
                            type="button"
                            onClick={() => handleReactivate(t.tenant_id, t.tenant_name)}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                          >
                            Reactivar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSuspend(t.tenant_id, t.tenant_name)}
                            className="text-xs font-bold text-red-700 hover:text-red-900 px-2.5 py-1 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            Suspender
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {showNewModal && (
        <NewTenantModal onClose={() => setShowNewModal(false)} onSuccess={() => router.refresh()} />
      )}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  color: string
}) {
  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl p-5">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-3xl font-black text-slate-900 leading-none">{value}</div>
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mt-1">{label}</div>
    </div>
  )
}

function PlanCard({ label, count, color }: { label: string; count: number; color: string }) {
  const colorMap: Record<string, string> = {
    purple: 'bg-gradient-to-br from-purple-600 to-indigo-700 text-white',
    blue: 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white',
    slate: 'bg-gradient-to-br from-slate-600 to-slate-800 text-white',
    amber: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white',
  }
  return (
    <div className={`rounded-2xl p-5 ${colorMap[color]}`}>
      <div className="text-xs font-black uppercase tracking-wider opacity-75">{label}</div>
      <div className="text-4xl font-black leading-none mt-2">{count}</div>
      <div className="text-xs font-medium opacity-75 mt-1">
        {count === 1 ? 'tenant activo' : 'tenants activos'}
      </div>
    </div>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, string> = {
    ENTERPRISE: 'bg-purple-100 text-purple-800',
    PROFESSIONAL: 'bg-blue-100 text-blue-800',
    STARTER: 'bg-slate-100 text-slate-700',
    TRIAL: 'bg-amber-100 text-amber-800',
    NONE: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${map[plan] || 'bg-slate-100 text-slate-700'}`}>
      {plan}
    </span>
  )
}

function StatusBadge({ status, isExpired }: { status: string; isExpired: boolean }) {
  if (isExpired) {
    return (
      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-800 flex items-center gap-1 w-fit">
        <AlertTriangle className="w-3 h-3" />
        EXPIRADA
      </span>
    )
  }
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-800',
    EXPIRED: 'bg-red-100 text-red-800',
    SUSPENDED: 'bg-amber-100 text-amber-800',
    CANCELLED: 'bg-slate-100 text-slate-600',
    NONE: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${map[status] || 'bg-slate-100'}`}>
      {status}
    </span>
  )
}
