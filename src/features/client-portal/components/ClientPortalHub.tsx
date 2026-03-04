'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { ClientSummary } from '../types'

interface ClientPortalHubProps {
  clients: ClientSummary[]
  totalInvoiced: number
  totalPaid: number
  totalOverdue: number
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

function getStatusConfig(client: ClientSummary): {
  label: string
  className: string
  dot: string
} {
  if (client.balance <= 0) {
    return { label: 'Al dia', className: 'bg-emerald-50 text-emerald-700 border border-emerald-100', dot: 'bg-emerald-500' }
  }
  if (client.has_overdue) {
    return { label: 'Vencido', className: 'bg-rose-50 text-rose-700 border border-rose-100', dot: 'bg-rose-500' }
  }
  return { label: 'Vence pronto', className: 'bg-amber-50 text-amber-700 border border-amber-100', dot: 'bg-amber-500' }
}

function ClientCard({ client, onClick }: { client: ClientSummary; onClick: () => void }) {
  const status = getStatusConfig(client)
  const initials = client.legal_name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-slate-100 rounded-2xl p-5 shadow-sm
                 hover:shadow-md hover:border-indigo-100
                 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-indigo-500"
      aria-label={`Ver detalle de ${client.legal_name}`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0
                        group-hover:bg-indigo-600 transition-colors duration-200">
          <span className="text-white font-bold text-xs tracking-tight">{initials}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate leading-snug">
                {client.legal_name}
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                NIT {client.doc_number || '—'}
              </p>
            </div>
            <span className={cn('text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap', status.className)}>
              <span className={cn('inline-block h-1.5 w-1.5 rounded-full mr-1 align-middle', status.dot)} />
              {status.label}
            </span>
          </div>

          {client.email && (
            <p className="text-[10px] text-slate-400 mt-1 truncate">{client.email}</p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-50">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Facturado</p>
          <p className="text-xs font-bold text-slate-900 font-mono tabular-nums truncate">{formatCOP(client.total_invoiced)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Pagado</p>
          <p className="text-xs font-bold text-emerald-600 font-mono tabular-nums truncate">{formatCOP(client.total_paid)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Saldo</p>
          <p className={cn('text-xs font-bold font-mono tabular-nums truncate', client.balance > 0 ? 'text-rose-600' : 'text-slate-400')}>
            {formatCOP(client.balance)}
          </p>
        </div>
      </div>
    </button>
  )
}

export function ClientPortalHub({ clients, totalInvoiced, totalPaid, totalOverdue }: ClientPortalHubProps) {
  const [search, setSearch] = useState('')
  const router = useRouter()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.legal_name.toLowerCase().includes(q) ||
        (c.doc_number || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
    )
  }, [clients, search])

  const stats = [
    {
      label: 'Total Clientes',
      value: clients.length.toString(),
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Total Facturado',
      value: formatCOP(totalInvoiced),
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Cartera Vencida',
      value: formatCOP(totalOverdue),
      icon: AlertCircle,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
    {
      label: 'Total Cobrado',
      value: formatCOP(totalPaid),
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center shrink-0', stat.bg)}>
                <stat.icon className={cn('h-3.5 w-3.5', stat.color)} />
              </div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
            </div>
            <p className="text-sm font-bold text-slate-900 font-mono tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o NIT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-5 py-3 bg-white border border-slate-200 rounded-xl
                     text-sm text-slate-900 placeholder:text-slate-400
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                     transition-all duration-200"
          aria-label="Buscar cliente"
        />
        {filtered.length !== clients.length && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 uppercase">
            {filtered.length} resultados
          </span>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-900">Sin resultados</p>
          <p className="text-xs text-slate-400 mt-1">
            {search ? `No hay clientes que coincidan con "${search}"` : 'No hay clientes registrados aun'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onClick={() => router.push(`/client-portal/${client.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
