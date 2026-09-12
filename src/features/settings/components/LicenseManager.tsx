'use client'

import { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ShieldOff,
  KeyRound,
  Download,
  CalendarDays,
  Users,
  Building2,
  BadgeCheck,
  CheckCircle2,
  Circle,
  RefreshCw,
  FileText,
  Copy,
  Check,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { toast } from 'sonner'
import {
  getLicense,
  getLicenseStatus,
  getDaysRemaining,
  getPlanLabel,
  getModuleLabel,
  type TenantLicense,
} from '@/features/settings/services/licenseService'

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_MODULES = [
  'dashboard',
  'analytics',
  'sales',
  'inventory',
  'crm',
  'purchasing',
  'documents',
  'production',
  'payroll',
  'accounting',
  'logistics',
  'settings',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatLicenseKey(key: string): string {
  // Normalize to uppercase and split into groups of 4
  const clean = key.replace(/-/g, '').toUpperCase()
  const groups = clean.match(/.{1,4}/g) ?? [clean]
  return groups.join('-')
}

// Azul corporativo de marca (BC FABRIC SAS · GVM Corp)
const BRAND = '#0096E6'

// Estilo del sello del plan sobre la tarjeta oscura (paleta sobria)
function planBadgeDark(plan: string): string {
  switch (plan) {
    case 'ENTERPRISE':
      return 'bg-sky-500/15 text-sky-200 border-sky-400/30'
    case 'PROFESSIONAL':
      return 'bg-blue-500/15 text-blue-200 border-blue-400/30'
    case 'STARTER':
      return 'bg-slate-400/15 text-slate-200 border-slate-300/25'
    case 'TRIAL':
      return 'bg-amber-500/15 text-amber-200 border-amber-400/30'
    default:
      return 'bg-slate-400/15 text-slate-200 border-slate-300/25'
  }
}


// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ReturnType<typeof getLicenseStatus> }) {
  const config = {
    VALID: { label: 'Activa', class: 'bg-emerald-100 text-emerald-700 border-emerald-200', Icon: ShieldCheck },
    EXPIRING_SOON: { label: 'Por Vencer', class: 'bg-yellow-100 text-yellow-700 border-yellow-200', Icon: ShieldAlert },
    EXPIRED: { label: 'Vencida', class: 'bg-red-100 text-red-700 border-red-200', Icon: ShieldX },
    SUSPENDED: { label: 'Suspendida', class: 'bg-orange-100 text-orange-700 border-orange-200', Icon: ShieldOff },
    NOT_FOUND: { label: 'No Encontrada', class: 'bg-gray-100 text-gray-600 border-gray-200', Icon: Circle },
  }
  const { label, class: cls, Icon } = config[status]
  return (
    <Badge className={cn('border font-bold px-3 py-1 flex items-center gap-1.5 text-xs', cls)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Badge>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function LicenseProgressBar({ license }: { license: TenantLicense }) {
  const totalDays = Math.ceil(
    (new Date(license.valid_until).getTime() - new Date(license.valid_from).getTime()) /
      (1000 * 60 * 60 * 24)
  )
  const daysRemaining = getDaysRemaining(license)
  const daysUsed = totalDays - daysRemaining
  const pct = Math.min(100, Math.max(0, (daysUsed / totalDays) * 100))

  const barColor =
    daysRemaining <= 0
      ? 'bg-red-500'
      : daysRemaining <= 30
      ? 'bg-yellow-400'
      : 'bg-emerald-400'

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-medium">
        <span className="text-slate-400">Desde: {formatDate(license.valid_from)}</span>
        <span className="text-slate-300 font-bold">
          {daysRemaining > 0 ? `${daysRemaining} días restantes` : 'Vencida'}
        </span>
        <span className="text-slate-400">Hasta: {formatDate(license.valid_until)}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── PDF Generator ────────────────────────────────────────────────────────────

function licenseStatusEs(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'Activa',
    EXPIRED: 'Vencida',
    SUSPENDED: 'Suspendida',
    CANCELLED: 'Cancelada',
  }
  return map[status] || status
}

function generateLicensePDF(license: TenantLicense): void {
  const doc = new jsPDF()
  const W = doc.internal.pageSize.width   // 210
  const H = doc.internal.pageSize.height  // 297
  const cx = W / 2

  const INK: [number, number, number] = [17, 24, 39]
  const MUTED: [number, number, number] = [107, 114, 128]
  const LINE: [number, number, number] = [209, 213, 219]
  const SOFT: [number, number, number] = [249, 250, 251]

  const today = new Date().toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // ── Marco doble (estilo diploma) ──
  doc.setDrawColor(...INK)
  doc.setLineWidth(0.6)
  doc.rect(12, 12, W - 24, H - 24)
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.2)
  doc.rect(15, 15, W - 30, H - 30)

  // ── Emisor ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...INK)
  doc.text('BC FABRIC S.A.S.', cx, 30, { align: 'center', charSpace: 2 })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text('SOFTWARE DE GESTIÓN EMPRESARIAL · GVM CORP', cx, 35.5, { align: 'center', charSpace: 1.2 })
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.3)
  doc.line(cx - 18, 39, cx + 18, 39)

  // ── Título ──
  doc.setFont('times', 'bold')
  doc.setFontSize(30)
  doc.setTextColor(...INK)
  doc.text('CERTIFICADO', cx, 58, { align: 'center' })
  doc.setFont('times', 'normal')
  doc.setFontSize(14)
  doc.setTextColor(...MUTED)
  doc.text('DE LICENCIA DE SOFTWARE', cx, 67, { align: 'center', charSpace: 2 })
  doc.setDrawColor(...INK)
  doc.setLineWidth(0.5)
  doc.line(cx - 28, 73, cx + 28, 73)

  // ── Intro ──
  doc.setFont('times', 'italic')
  doc.setFontSize(10.5)
  doc.setTextColor(...MUTED)
  const intro = doc.splitTextToSize(
    'BC FABRIC S.A.S. hace constar que la presente licencia de uso del software ha sido otorgada de forma legítima a:',
    150,
  )
  doc.text(intro, cx, 85, { align: 'center' })

  // ── Licenciatario ──
  // Ajuste automático: se reduce la fuente hasta caber en el ancho útil y,
  // si aún es muy largo, se divide en dos líneas (sin salirse de los márgenes).
  const nameMaxW = 150
  doc.setFont('times', 'bold')
  let nameSize = 19
  doc.setFontSize(nameSize)
  while (doc.getTextWidth(license.company_name) > nameMaxW && nameSize > 11) {
    nameSize -= 1
    doc.setFontSize(nameSize)
  }
  doc.setTextColor(...INK)
  let nitY = 109
  if (doc.getTextWidth(license.company_name) > nameMaxW) {
    const nameLines = doc.splitTextToSize(license.company_name, nameMaxW)
    const lineH = nameSize * 0.42
    nameLines.forEach((ln: string, i: number) => {
      doc.text(ln, cx, 100 + i * lineH, { align: 'center' })
    })
    nitY = 100 + nameLines.length * lineH + 1
  } else {
    doc.text(license.company_name, cx, 102, { align: 'center' })
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...MUTED)
  doc.text(`NIT ${license.company_nit}`, cx, nitY, { align: 'center' })

  // ── Clave de licencia ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text('CLAVE DE LICENCIA', cx, 120, { align: 'center', charSpace: 2 })
  doc.setFillColor(...SOFT)
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.3)
  doc.roundedRect(cx - 62, 123, 124, 13, 2, 2, 'FD')
  doc.setFont('courier', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...INK)
  doc.text(formatLicenseKey(license.license_key), cx, 131.5, { align: 'center', charSpace: 1 })

  // ── Detalles ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTED)
  doc.text('DETALLES DE LA LICENCIA', cx, 148, { align: 'center', charSpace: 2 })
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.2)
  doc.line(cx - 30, 151, cx + 30, 151)

  const daysLeft = getDaysRemaining(license)
  const field = (label: string, value: string, x: number, y: number): void => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text(label.toUpperCase(), x, y, { charSpace: 0.5 })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...INK)
    doc.text(value, x, y + 5.5)
  }

  const xL = 30, xR = 112
  let gy = 160
  field('Plan', getPlanLabel(license.plan), xL, gy)
  field('Estado', licenseStatusEs(license.status), xR, gy)
  gy += 15
  field('Usuarios máximos', `${license.max_users} usuarios`, xL, gy)
  field('Días restantes', daysLeft > 0 ? `${daysLeft} días` : 'Vencida', xR, gy)
  gy += 15
  field('Válida desde', formatDate(license.valid_from), xL, gy)
  field('Válida hasta', formatDate(license.valid_until), xR, gy)
  gy += 15
  field('Emitida por', license.issued_by, xL, gy)
  field('Fecha de emisión', formatDate(license.issued_at), xR, gy)
  gy += 17

  // ── Módulos ──
  const mods = license.modules_enabled.map(getModuleLabel)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTED)
  doc.text(`MÓDULOS HABILITADOS (${mods.length})`, xL, gy, { charSpace: 1 })
  gy += 6.5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  const cols = 3
  const cw = 150 / cols
  mods.forEach((m, i) => {
    const col = i % cols
    const rowy = gy + Math.floor(i / cols) * 5.5
    const mx = xL + col * cw
    doc.setTextColor(...MUTED)
    doc.text('—', mx, rowy)
    doc.setTextColor(...INK)
    doc.text(m, mx + 4, rowy)
  })
  const modRows = Math.ceil(mods.length / cols)
  gy += modRows * 5.5 + 10

  // ── Firma ──
  const sigY = Math.min(Math.max(gy + 12, 246), 252)
  doc.setDrawColor(...INK)
  doc.setLineWidth(0.4)
  doc.line(cx - 30, sigY, cx + 30, sigY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...INK)
  doc.text(license.issued_by, cx, sigY + 6, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('Representante Autorizado · BC FABRIC S.A.S.', cx, sigY + 11, { align: 'center' })

  // ── Pie ──
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.2)
  doc.line(24, H - 30, W - 24, H - 30)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...MUTED)
  doc.text(`Documento generado el ${today}.`, 24, H - 24)
  doc.text('Verificación: soporte@bcfabric.com.co', W - 24, H - 24, { align: 'right' })
  doc.setFontSize(6.5)
  doc.text(
    'Certificado emitido electrónicamente por el sistema ERP GVM Corp. Su validez está sujeta a los términos del contrato de licenciamiento.',
    cx, H - 19, { align: 'center' },
  )

  doc.save(`certificado-licencia-${license.company_nit}.pdf`)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function LicenseManager() {
  const [license, setLicense] = useState<TenantLicense | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    getLicense()
      .then(setLicense)
      .finally(() => setLoading(false))
  }, [])

  async function copyKey(): Promise<void> {
    if (!license) return
    try {
      await navigator.clipboard.writeText(formatLicenseKey(license.license_key))
      setCopied(true)
      toast.success('Clave de licencia copiada')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('No se pudo copiar la clave')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <RefreshCw className="h-10 w-10 animate-spin text-slate-300" />
        <p className="text-sm text-slate-400 font-medium">Cargando licencia...</p>
      </div>
    )
  }

  if (!license) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="h-20 w-20 rounded-2xl bg-slate-100 flex items-center justify-center">
          <ShieldX className="h-10 w-10 text-slate-300" />
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-slate-700">No se encontro licencia</p>
          <p className="text-sm text-slate-400 mt-1">
            No hay una licencia activa asociada a este tenant. Contacta a BC FABRIC SAS.
          </p>
        </div>
      </div>
    )
  }

  const status = getLicenseStatus(license)
  const daysRemaining = getDaysRemaining(license)

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0"
            style={{ backgroundColor: BRAND }}
          >
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
              Configuración · Licenciamiento
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Licencia de Software
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              GVM Corp ERP — Emitida por BC FABRIC SAS
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
            <BadgeCheck className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-[11px] font-semibold text-slate-600">Certificado oficial</span>
          </div>
        </div>
      </div>

      {/* Status Banner — only shown if expiring/expired/suspended */}
      {(status === 'EXPIRING_SOON' || status === 'EXPIRED' || status === 'SUSPENDED') && (
        <div
          className={cn(
            'flex items-center gap-3 px-5 py-4 rounded-2xl border font-medium text-sm',
            status === 'EXPIRING_SOON' && 'bg-amber-50 border-amber-200 text-amber-800',
            status === 'EXPIRED' && 'bg-red-50 border-red-200 text-red-800',
            status === 'SUSPENDED' && 'bg-orange-50 border-orange-200 text-orange-800',
          )}
        >
          {status === 'EXPIRING_SOON' && <ShieldAlert className="h-5 w-5 shrink-0" />}
          {status === 'EXPIRED' && <ShieldX className="h-5 w-5 shrink-0" />}
          {status === 'SUSPENDED' && <ShieldOff className="h-5 w-5 shrink-0" />}
          <span>
            {status === 'EXPIRING_SOON' &&
              `Tu licencia vence en ${daysRemaining} días. Contacta a BC FABRIC SAS para renovarla antes de la fecha límite.`}
            {status === 'EXPIRED' &&
              'Tu licencia ha vencido. Algunas funciones pueden estar restringidas. Contacta a BC FABRIC SAS para renovar.'}
            {status === 'SUSPENDED' &&
              'Tu licencia ha sido suspendida. Contacta a BC FABRIC SAS para resolver esta situación.'}
          </span>
        </div>
      )}

      {/* Main License Card */}
      <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 text-white relative">
        {/* Top brand accent */}
        <div className="h-1.5 w-full" style={{ backgroundColor: BRAND }} />
        {/* Background watermark icon */}
        <div className="absolute top-6 right-0 p-10 opacity-[0.04] pointer-events-none">
          <ShieldCheck className="h-44 w-44" />
        </div>
        {/* Subtle brand glow */}
        <div
          className="absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: BRAND }}
        />

        <CardContent className="p-8 md:p-10 space-y-8 relative z-10">
          {/* Top row: plan badge + status badge */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge
                className={cn(
                  'border font-bold text-[11px] px-3 py-1 rounded-full mb-3',
                  planBadgeDark(license.plan)
                )}
              >
                Plan {getPlanLabel(license.plan)}
              </Badge>
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">
                {license.company_name}
              </h3>
              <p className="text-slate-400 text-sm font-mono mt-1">NIT {license.company_nit}</p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <StatusBadge status={status} />
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-300">
                  Hasta {license.max_users} usuarios
                </span>
              </div>
            </div>
          </div>

          {/* License Key */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                  <KeyRound className="h-3 w-3" />
                  Clave de Licencia
                </p>
                <p className="font-mono text-base md:text-lg font-bold tracking-[0.15em] text-white break-all mt-2">
                  {formatLicenseKey(license.license_key)}
                </p>
              </div>
              <button
                onClick={copyKey}
                className="shrink-0 h-10 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all active:scale-95"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copiada' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Validity + Progress */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Vigencia
              </span>
            </div>
            <LicenseProgressBar license={license} />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                Emitida por
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="font-semibold text-sm text-white truncate">{license.issued_by}</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                Fecha de Emisión
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="font-semibold text-sm text-white">
                  {new Date(license.issued_at).toLocaleDateString('es-CO')}
                </span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                Módulos Activos
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: BRAND }} />
                <span className="font-semibold text-sm text-white">
                  {license.modules_enabled.length} / {ALL_MODULES.length}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modules Grid */}
      <Card className="surface-card overflow-hidden">
        <CardHeader className="px-6 md:px-8 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
              Módulos Incluidos
            </CardTitle>
            <Badge
              variant="secondary"
              className="bg-slate-100 text-slate-600 border-none font-semibold"
            >
              {license.modules_enabled.length} habilitados
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ALL_MODULES.map((mod) => {
              const enabled = license.modules_enabled.includes(mod)
              return (
                <div
                  key={mod}
                  className={cn(
                    'flex items-center gap-3 p-3.5 rounded-2xl border transition-colors',
                    enabled
                      ? 'bg-sky-50 border-sky-100'
                      : 'bg-slate-50 border-slate-100 opacity-60'
                  )}
                >
                  {enabled ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: BRAND }} />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300 shrink-0" />
                  )}
                  <span
                    className={cn(
                      'text-xs font-semibold',
                      enabled ? 'text-slate-800' : 'text-slate-400'
                    )}
                  >
                    {getModuleLabel(mod)}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {license.notes && (
        <Card className="surface-card overflow-hidden">
          <CardContent className="p-6 md:p-8 flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Notas de la Licencia
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">{license.notes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card className="surface-card overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div
                className="h-11 w-11 rounded-2xl flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: BRAND }}
              >
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Certificado de Licencia
                </h3>
                <p className="text-sm text-slate-500 mt-0.5 max-w-md">
                  Descarga el certificado oficial en PDF para presentarlo ante clientes o auditores.
                </p>
              </div>
            </div>
            <Button
              onClick={() => generateLicensePDF(license)}
              className="h-12 px-6 rounded-2xl text-white font-bold text-sm shadow-sm hover:opacity-90 transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
              style={{ backgroundColor: BRAND }}
            >
              <Download className="h-4 w-4" />
              Descargar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
