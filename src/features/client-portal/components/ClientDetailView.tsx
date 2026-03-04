'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Phone, Building2, Printer, FileText, CreditCard, BarChart2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { cn } from '@/shared/lib/utils'
import type { ClientDetail, ClientDocument, ClientPayment, AgingBucket } from '../types'

interface ClientDetailViewProps {
  client: ClientDetail
  invoices: ClientDocument[]
  payments: ClientPayment[]
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return format(new Date(dateStr), 'dd MMM yyyy', { locale: es })
  } catch {
    return dateStr
  }
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PAID:   { label: 'Pagado',    className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  SENT:   { label: 'Enviado',   className: 'bg-blue-50 text-blue-700 border border-blue-100' },
  DRAFT:  { label: 'Borrador',  className: 'bg-slate-50 text-slate-500 border border-slate-100' },
  VOIDED: { label: 'Anulado',   className: 'bg-rose-50 text-rose-700 border border-rose-100' },
  OVERDUE:{ label: 'Vencido',   className: 'bg-rose-50 text-rose-700 border border-rose-100' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? { label: status, className: 'bg-slate-50 text-slate-500' }
  return (
    <span className={cn('text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full', cfg.className)}>
      {cfg.label}
    </span>
  )
}

function computeAging(invoices: ClientDocument[]): AgingBucket[] {
  const now = new Date()
  const buckets: AgingBucket[] = [
    { label: 'Corriente', days: '0-30',  amount: 0, count: 0 },
    { label: '31-60 dias', days: '31-60', amount: 0, count: 0 },
    { label: '61-90 dias', days: '61-90', amount: 0, count: 0 },
    { label: 'Mayor 90',  days: '+90',   amount: 0, count: 0 },
  ]

  for (const inv of invoices) {
    if (!inv.due_date || inv.balance <= 0) continue
    const due = new Date(inv.due_date)
    const days = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
    if (days <= 0) {
      buckets[0].amount += inv.balance; buckets[0].count++
    } else if (days <= 30) {
      buckets[0].amount += inv.balance; buckets[0].count++
    } else if (days <= 60) {
      buckets[1].amount += inv.balance; buckets[1].count++
    } else if (days <= 90) {
      buckets[2].amount += inv.balance; buckets[2].count++
    } else {
      buckets[3].amount += inv.balance; buckets[3].count++
    }
  }
  return buckets
}

export function ClientDetailView({ client, invoices, payments }: ClientDetailViewProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('invoices')

  const initials = client.legal_name
    .split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase()

  const totalInvoiced = useMemo(() => invoices.reduce((s, i) => s + (i.total || 0), 0), [invoices])
  const totalPaid     = useMemo(() => invoices.reduce((s, i) => s + ((i.total || 0) - (i.balance || 0)), 0), [invoices])
  const totalBalance  = useMemo(() => invoices.reduce((s, i) => s + (i.balance || 0), 0), [invoices])
  const overdueCount  = useMemo(() => {
    const now = new Date()
    return invoices.filter(i => i.balance > 0 && i.due_date && new Date(i.due_date) < now).length
  }, [invoices])

  const aging = useMemo(() => computeAging(invoices), [invoices])
  const maxAging = useMemo(() => Math.max(...aging.map(b => b.amount), 1), [aging])

  const statCards = [
    { label: 'Total Facturado', value: formatCOP(totalInvoiced), color: 'text-slate-900' },
    { label: 'Cobrado',         value: formatCOP(totalPaid),     color: 'text-emerald-600' },
    { label: 'Saldo Pendiente', value: formatCOP(totalBalance),  color: totalBalance > 0 ? 'text-rose-600' : 'text-emerald-600' },
    { label: 'Facturas Vencidas', value: overdueCount.toString(), color: overdueCount > 0 ? 'text-rose-600' : 'text-slate-900' },
  ]

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-500">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors text-xs font-semibold uppercase tracking-wide"
        aria-label="Volver al listado"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Portal del Cliente</span>
      </button>

      {/* Client Header */}
      <div className="bg-slate-900 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-[0.04] pointer-events-none">
          <Building2 className="h-32 w-32" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-5">
          <div className="h-14 w-14 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-lg">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white truncate">{client.legal_name}</h1>
            <p className="text-slate-400 text-xs font-medium mt-1">NIT {client.doc_number || '—'}</p>
            <div className="flex flex-wrap gap-4 mt-2">
              {client.email && (
                <span className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                  <Mail className="h-3 w-3" /> {client.email}
                </span>
              )}
              {client.phone && (
                <span className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                  <Phone className="h-3 w-3" /> {client.phone}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10
                       text-white text-xs font-semibold uppercase tracking-wide px-4 py-2.5 rounded-xl
                       transition-all duration-200 shrink-0"
            aria-label="Imprimir estado de cuenta"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Estado de Cuenta</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{s.label}</p>
            <p className={cn('text-lg font-bold font-mono tabular-nums truncate', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-50 border border-slate-100 rounded-xl p-1 h-auto gap-1 flex-wrap">
          <TabsTrigger value="invoices"
            className="rounded-lg text-[10px] font-semibold uppercase tracking-wider data-[state=active]:bg-slate-900 data-[state=active]:text-white flex items-center gap-1.5">
            <FileText className="h-3 w-3" /> Facturas
          </TabsTrigger>
          <TabsTrigger value="payments"
            className="rounded-lg text-[10px] font-semibold uppercase tracking-wider data-[state=active]:bg-slate-900 data-[state=active]:text-white flex items-center gap-1.5">
            <CreditCard className="h-3 w-3" /> Pagos
          </TabsTrigger>
          <TabsTrigger value="aging"
            className="rounded-lg text-[10px] font-semibold uppercase tracking-wider data-[state=active]:bg-slate-900 data-[state=active]:text-white flex items-center gap-1.5">
            <BarChart2 className="h-3 w-3" /> Estado de Cuenta
          </TabsTrigger>
        </TabsList>

        {/* Tab: Facturas */}
        <TabsContent value="invoices" className="mt-6">
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            {invoices.length === 0 ? (
              <div className="py-14 text-center">
                <FileText className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-semibold text-xs">Sin facturas registradas</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" role="table" aria-label="Facturas del cliente">
                  <thead>
                    <tr className="border-b border-slate-50 bg-slate-50/50">
                      {['Numero', 'Fecha', 'Vencimiento', 'Total', 'Saldo', 'Estado'].map((h) => (
                        <th key={h} scope="col"
                          className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {invoices.map((inv, idx) => {
                      const isOverdue = inv.balance > 0 && inv.due_date && new Date(inv.due_date) < new Date()
                      const displayStatus = isOverdue && inv.status !== 'PAID' ? 'OVERDUE' : inv.status
                      return (
                        <tr key={inv.id}
                          className={cn('transition-colors hover:bg-slate-50/80', idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30')}>
                          <td className="px-5 py-3 text-xs font-bold text-slate-900">{inv.number || '—'}</td>
                          <td className="px-5 py-3 text-xs text-slate-500">{formatDate(inv.issue_date)}</td>
                          <td className="px-5 py-3 text-xs text-slate-500">{formatDate(inv.due_date)}</td>
                          <td className="px-5 py-3 text-xs font-bold text-slate-900 font-mono tabular-nums">{formatCOP(inv.total)}</td>
                          <td className={cn('px-5 py-3 text-xs font-bold font-mono tabular-nums', inv.balance > 0 ? 'text-rose-600' : 'text-emerald-600')}>
                            {formatCOP(inv.balance)}
                          </td>
                          <td className="px-5 py-3">
                            <StatusBadge status={displayStatus} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab: Pagos */}
        <TabsContent value="payments" className="mt-6">
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            {payments.length === 0 ? (
              <div className="py-14 text-center">
                <CreditCard className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-semibold text-xs">Sin pagos registrados</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {payments.map((pay) => (
                  <div key={pay.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                        <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{pay.description || 'Pago recibido'}</p>
                        <p className="text-[10px] text-slate-400">{formatDate(pay.date)}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 font-mono tabular-nums shrink-0">+ {formatCOP(pay.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab: Aging */}
        <TabsContent value="aging" className="mt-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Analisis de Cartera</h3>
              <p className="text-xs text-slate-400 mt-0.5">Distribucion de saldos por antiguedad de vencimiento</p>
            </div>
            <div className="space-y-4">
              {aging.map((bucket) => {
                const pct = maxAging > 0 ? (bucket.amount / maxAging) * 100 : 0
                const isEmpty = bucket.amount === 0
                return (
                  <div key={bucket.days} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">{bucket.label}</span>
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                          {bucket.days} dias
                        </span>
                        {bucket.count > 0 && (
                          <span className="text-[10px] font-medium text-slate-400">{bucket.count} factura{bucket.count !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                      <span className={cn('text-xs font-bold font-mono tabular-nums', isEmpty ? 'text-slate-400' : 'text-slate-900')}>
                        {formatCOP(bucket.amount)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-700',
                          bucket.days === '0-30' ? 'bg-emerald-500' :
                          bucket.days === '31-60' ? 'bg-amber-500' :
                          bucket.days === '61-90' ? 'bg-orange-500' : 'bg-rose-500'
                        )}
                        style={{ width: `${pct}%` }}
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Totals summary */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">Total Cartera</span>
              <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">{formatCOP(totalBalance)}</span>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
