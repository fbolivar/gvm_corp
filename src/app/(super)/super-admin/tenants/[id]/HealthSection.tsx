'use client'

import {
  Activity,
  Users,
  FileText,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  LogIn,
} from 'lucide-react'
import type { TenantHealth } from '@/features/super-admin/services/superAdminService'

function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days} d`
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function actionVerb(action: string): string {
  const map: Record<string, string> = {
    CREATE: 'creó',
    INSERT: 'creó',
    UPDATE: 'actualizó',
    DELETE: 'eliminó',
    IMPERSONATE: 'impersonó',
    LOGIN: 'ingresó',
  }
  return map[action] || action.toLowerCase()
}

function entityLabel(entity: string): string {
  const map: Record<string, string> = {
    tenants: 'tenant',
    tenant_licenses: 'licencia',
    documents: 'documento',
    employees: 'empleado',
    parties: 'tercero',
    products: 'producto',
    product_lots: 'lote',
    inventory_movements: 'movimiento inventario',
    purchase_orders: 'orden compra',
    journal_entries: 'asiento',
    leads: 'prospecto',
  }
  return map[entity] || entity
}

function ActionIcon({ action }: { action: string }) {
  const map: Record<string, { bg: string; Icon: React.ComponentType<{ className?: string }> }> = {
    CREATE: { bg: 'bg-emerald-50 text-emerald-600', Icon: Plus },
    INSERT: { bg: 'bg-emerald-50 text-emerald-600', Icon: Plus },
    UPDATE: { bg: 'bg-sky-50 text-sky-600', Icon: Pencil },
    DELETE: { bg: 'bg-rose-50 text-rose-600', Icon: Trash2 },
    IMPERSONATE: { bg: 'bg-violet-50 text-violet-600', Icon: LogIn },
  }
  const cfg = map[action] || { bg: 'bg-slate-100 text-slate-500', Icon: Activity }
  const I = cfg.Icon
  return (
    <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
      <I className="w-3.5 h-3.5" />
    </div>
  )
}

function HealthKpi({
  label, value, icon: Icon,
}: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-lg font-bold text-slate-900 tabular-nums truncate">{value}</p>
        </div>
      </div>
    </div>
  )
}

export function HealthSection({ health }: { health: TenantHealth | null }) {
  if (!health) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No hay datos de salud disponibles</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <HealthKpi label="Última actividad" value={fmtRelative(health.last_activity_at)} icon={Activity} />
        <HealthKpi label="Usuarios activos 30d" value={health.active_users_30d.toString()} icon={Users} />
        <HealthKpi label="Docs últimos 7d" value={health.documents_7d.toString()} icon={FileText} />
        <HealthKpi label="Eventos 30d" value={health.total_events_30d.toString()} icon={Sparkles} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Últimas actividades</h3>
          <span className="text-xs text-slate-500">{health.timeline.length} eventos</span>
        </div>
        {health.timeline.length === 0 ? (
          <div className="p-10 text-center">
            <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Sin actividad registrada</p>
          </div>
        ) : (
          <ol className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {health.timeline.map(e => (
              <li key={e.log_id} className="px-4 py-3 hover:bg-slate-50/60 flex items-start gap-3">
                <ActionIcon action={e.action} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">
                    <strong>{e.actor_name || 'Sistema'}</strong>
                    <span className="text-slate-500 ml-1">
                      {actionVerb(e.action)} {entityLabel(e.entity)}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                    {fmtRelative(e.created_at)} · <span className="text-slate-400">{new Date(e.created_at).toLocaleString('es-CO')}</span>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

export { ActionIcon, actionVerb, fmtRelative }
