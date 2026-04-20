'use client'

import { History } from 'lucide-react'
import type { LicenseHistoryRow } from '@/features/super-admin/services/superAdminService'
import { ActionIcon, actionVerb, fmtRelative } from './HealthSection'

export function LicenseHistorySection({ history }: { history: LicenseHistoryRow[] }) {
  if (history.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
        <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Sin cambios registrados en la licencia</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <h3 className="text-base font-semibold text-slate-900">Historial de licencia</h3>
        <p className="text-xs text-slate-500 mt-0.5">Últimos {history.length} cambios registrados en audit_log</p>
      </div>
      <ol className="divide-y divide-slate-100">
        {history.map(h => {
          const payload = h.payload as { plan?: string; status?: string; max_users?: number; valid_until?: string } | null
          return (
            <li key={h.log_id} className="px-4 py-3 hover:bg-slate-50/60 flex items-start gap-3">
              <ActionIcon action={h.action} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-900">
                  <strong>{h.actor_name || 'Sistema'}</strong>
                  <span className="text-slate-500 ml-1">{actionVerb(h.action)} licencia</span>
                </p>
                {payload && (
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px]">
                    {payload.plan && (
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        plan: {payload.plan}
                      </span>
                    )}
                    {payload.status && (
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        estado: {payload.status}
                      </span>
                    )}
                    {payload.max_users !== undefined && (
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        max_users: {payload.max_users}
                      </span>
                    )}
                    {payload.valid_until && (
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        vence: {payload.valid_until}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-[11px] text-slate-500 tabular-nums mt-1">
                  {fmtRelative(h.created_at)} · <span className="text-slate-400">{new Date(h.created_at).toLocaleString('es-CO')}</span>
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
