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
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
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

function planColorClass(plan: string): string {
  switch (plan) {
    case 'ENTERPRISE':
      return 'bg-purple-100 text-purple-700 border-purple-200'
    case 'PROFESSIONAL':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'STARTER':
      return 'bg-slate-100 text-slate-600 border-slate-200'
    case 'TRIAL':
      return 'bg-orange-100 text-orange-700 border-orange-200'
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200'
  }
}

function planDarkClass(plan: string): string {
  switch (plan) {
    case 'ENTERPRISE':
      return 'from-purple-900 via-slate-900 to-slate-900'
    case 'PROFESSIONAL':
      return 'from-blue-900 via-slate-900 to-slate-900'
    case 'STARTER':
      return 'from-slate-800 via-slate-900 to-slate-900'
    case 'TRIAL':
      return 'from-orange-900 via-slate-900 to-slate-900'
    default:
      return 'from-slate-800 to-slate-900'
  }
}

function planAccentColor(plan: string): string {
  switch (plan) {
    case 'ENTERPRISE': return '#7c3aed'
    case 'PROFESSIONAL': return '#1d4ed8'
    case 'TRIAL': return '#ea580c'
    default: return '#475569'
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

function generateLicensePDF(license: TenantLicense): void {
  const doc = new jsPDF()
  const W = doc.internal.pageSize.width
  const margin = 14
  const maxWidth = W - margin * 2
  const accentColor = planAccentColor(license.plan)
  const accentRGB = hexToRgb(accentColor)
  const today = new Date().toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // ── Header background ──
  doc.setFillColor(0, 150, 230)
  doc.rect(0, 0, W, 50, 'F')

  // ── Accent left stripe ──
  doc.setFillColor(accentRGB.r, accentRGB.g, accentRGB.b)
  doc.rect(0, 0, 5, 297, 'F')

  // ── Issuer branding ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text('EMITIDO POR', 14, 14)

  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text('BC FABRIC SAS', 14, 26)

  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text('Software ERP · GVM Corp', 14, 34)

  // ── Title banner ──
  doc.setFillColor(accentRGB.r, accentRGB.g, accentRGB.b)
  doc.rect(5, 52, W - 5, 16, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(255, 255, 255)
  doc.text('CERTIFICADO DE LICENCIA DE SOFTWARE', 14, 62.5)

  // ── Plan badge (top-right) ──
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text(`PLAN ${getPlanLabel(license.plan).toUpperCase()}`, W - margin, 26, { align: 'right' })

  let y = 82

  // ── Section helper ──
  const sectionTitle = (text: string, yPos: number): number => {
    doc.setFillColor(248, 250, 252)
    doc.rect(margin, yPos - 5, maxWidth, 9, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(accentRGB.r, accentRGB.g, accentRGB.b)
    doc.text(text.toUpperCase(), margin + 2, yPos + 1)
    return yPos + 12
  }

  const row = (label: string, value: string, yPos: number, bold = false): number => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text(label, margin + 2, yPos)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text(value, margin + 60, yPos)
    return yPos + 7
  }

  // ── Company data ──
  y = sectionTitle('Datos del Licenciatario', y)
  y = row('Empresa:', license.company_name, y)
  y = row('NIT:', license.company_nit, y)
  y += 4

  // ── License data ──
  y = sectionTitle('Datos de la Licencia', y)
  y = row('Clave de Licencia:', formatLicenseKey(license.license_key), y, true)
  y = row('Plan:', getPlanLabel(license.plan), y)
  y = row('Estado:', license.status, y)
  y = row('Usuarios Máximos:', `${license.max_users} usuarios`, y)
  y += 4

  // ── Validity ──
  y = sectionTitle('Vigencia', y)
  y = row('Válida Desde:', formatDate(license.valid_from), y)
  y = row('Válida Hasta:', formatDate(license.valid_until), y)
  const daysLeft = getDaysRemaining(license)
  y = row('Días Restantes:', daysLeft > 0 ? `${daysLeft} días` : 'Vencida', y)
  y += 4

  // ── Modules ──
  y = sectionTitle('Módulos Habilitados', y)
  const enabledModules = license.modules_enabled.map(getModuleLabel)
  const cols = 2
  const colW = maxWidth / cols
  enabledModules.forEach((mod, i) => {
    const col = i % cols
    const xPos = margin + 2 + col * colW
    const yPos = y + Math.floor(i / cols) * 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(accentRGB.r, accentRGB.g, accentRGB.b)
    doc.text('•', xPos, yPos)
    doc.setTextColor(15, 23, 42)
    doc.text(mod, xPos + 5, yPos)
  })
  y += Math.ceil(enabledModules.length / cols) * 7 + 6

  // ── Issued by ──
  y = sectionTitle('Emisión', y)
  y = row('Emitido por:', license.issued_by, y)
  y = row('Fecha de Emisión:', formatDate(license.issued_at), y)
  y = row('Generado el:', today, y)

  // ── Notes ──
  if (license.notes) {
    y += 4
    y = sectionTitle('Notas', y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    const noteLines = doc.splitTextToSize(license.notes, maxWidth - 4)
    doc.text(noteLines, margin + 2, y)
    y += noteLines.length * 5.5 + 4
  }

  // ── Signature line ──
  const sigY = Math.max(y + 20, 230)
  doc.setDrawColor(0, 150, 230)
  doc.setLineWidth(0.3)
  doc.line(margin, sigY, margin + 80, sigY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.text(license.issued_by.toUpperCase(), margin, sigY + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('Representante Comercial · BC FABRIC SAS', margin, sigY + 12)

  // ── Footer ──
  doc.setFillColor(248, 250, 252)
  doc.rect(0, 277, W, 20, 'F')
  doc.setFillColor(accentRGB.r, accentRGB.g, accentRGB.b)
  doc.rect(0, 277, 5, 20, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(148, 163, 184)
  doc.text(
    'Este certificado es generado automáticamente por el sistema ERP GVM Corp · BC FABRIC SAS',
    14, 285
  )
  doc.text(
    'Documento con validez legal. Para verificar autenticidad contactar a soporte@bcfabric.com.co',
    14, 291
  )

  doc.save(`licencia-${license.company_nit}-${license.plan.toLowerCase()}.pdf`)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 79, g: 70, b: 229 }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function LicenseManager() {
  const [license, setLicense] = useState<TenantLicense | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLicense()
      .then(setLicense)
      .finally(() => setLoading(false))
  }, [])

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
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-slate-900 italic">
            Licencia de Software
          </h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
            GVM Corp ERP — Emitida por BC FABRIC SAS
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-200">
          <BadgeCheck className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
            Certificado Oficial
          </span>
        </div>
      </div>

      {/* Status Banner — only shown if expiring/expired/suspended */}
      {(status === 'EXPIRING_SOON' || status === 'EXPIRED' || status === 'SUSPENDED') && (
        <div
          className={cn(
            'flex items-center gap-3 px-6 py-4 rounded-2xl border font-medium text-sm',
            status === 'EXPIRING_SOON' && 'bg-yellow-50 border-yellow-200 text-yellow-800',
            status === 'EXPIRED' && 'bg-red-50 border-red-200 text-red-800',
            status === 'SUSPENDED' && 'bg-orange-50 border-orange-200 text-orange-800',
          )}
        >
          {status === 'EXPIRING_SOON' && <ShieldAlert className="h-5 w-5 shrink-0" />}
          {status === 'EXPIRED' && <ShieldX className="h-5 w-5 shrink-0" />}
          {status === 'SUSPENDED' && <ShieldOff className="h-5 w-5 shrink-0" />}
          <span>
            {status === 'EXPIRING_SOON' &&
              `Tu licencia vence en ${daysRemaining} dias. Contacta a BC FABRIC SAS para renovarla antes de la fecha limite.`}
            {status === 'EXPIRED' &&
              'Tu licencia ha vencido. Algunas funciones pueden estar restringidas. Contacta a BC FABRIC SAS para renovar.'}
            {status === 'SUSPENDED' &&
              'Tu licencia ha sido suspendida. Contacta a BC FABRIC SAS para resolver esta situacion.'}
          </span>
        </div>
      )}

      {/* Main License Card */}
      <Card
        className={cn(
          'border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-gradient-to-br text-white relative',
          planDarkClass(license.plan)
        )}
      >
        {/* Background watermark icon */}
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
          <ShieldCheck className="h-40 w-40" />
        </div>

        <CardContent className="p-10 space-y-8 relative z-10">
          {/* Top row: plan badge + status badge */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge
                className={cn(
                  'border font-black text-xs px-3 py-1 mb-4',
                  planColorClass(license.plan)
                )}
              >
                {getPlanLabel(license.plan).toUpperCase()}
              </Badge>
              <h3 className="text-3xl font-black italic tracking-wide leading-tight">
                {license.company_name}
              </h3>
              <p className="text-slate-400 text-sm font-mono mt-1">NIT {license.company_nit}</p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <StatusBadge status={status} />
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-300">
                  Hasta {license.max_users} usuarios
                </span>
              </div>
            </div>
          </div>

          {/* License Key */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <KeyRound className="h-3 w-3" />
              Clave de Licencia
            </p>
            <p className="font-mono text-lg font-bold tracking-[0.15em] text-white break-all">
              {formatLicenseKey(license.license_key)}
            </p>
          </div>

          {/* Validity + Progress */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Vigencia
              </span>
            </div>
            <LicenseProgressBar license={license} />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                Emitida por
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Building2 className="h-4 w-4 text-slate-400" />
                <span className="font-bold text-sm text-white">{license.issued_by}</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                Fecha Emision
              </p>
              <div className="flex items-center gap-2 mt-1">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                <span className="font-bold text-sm text-white">
                  {new Date(license.issued_at).toLocaleDateString('es-CO')}
                </span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                Modulos Activos
              </p>
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="font-bold text-sm text-white">
                  {license.modules_enabled.length} / {ALL_MODULES.length}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modules Grid */}
      <Card className="border-none shadow-premium rounded-[2.5rem] bg-white overflow-hidden">
        <CardHeader className="px-10 pt-8 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-black text-slate-900 italic">
              Modulos Incluidos
            </CardTitle>
            <Badge
              variant="secondary"
              className="bg-slate-100 text-slate-600 border-none font-bold"
            >
              {license.modules_enabled.length} habilitados
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ALL_MODULES.map((mod) => {
              const enabled = license.modules_enabled.includes(mod)
              return (
                <div
                  key={mod}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-2xl border transition-colors',
                    enabled
                      ? 'bg-emerald-50 border-emerald-100'
                      : 'bg-slate-50 border-slate-100 opacity-50'
                  )}
                >
                  {enabled ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300 shrink-0" />
                  )}
                  <span
                    className={cn(
                      'text-xs font-bold',
                      enabled ? 'text-emerald-800' : 'text-slate-400'
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
        <Card className="border-none shadow-premium rounded-[2.5rem] bg-amber-50 overflow-hidden">
          <CardContent className="p-8 flex items-start gap-4">
            <FileText className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">
                Notas de la Licencia
              </p>
              <p className="text-sm text-amber-800">{license.notes}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card className="border-none shadow-premium rounded-[2.5rem] bg-gradient-to-r from-emerald-600 to-teal-600 overflow-hidden">
        <CardContent className="p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-black text-white italic">Certificado de Licencia</h3>
              <p className="text-emerald-100 text-sm mt-1">
                Descarga el certificado oficial en PDF para presentar ante clientes o auditores.
              </p>
            </div>
            <Button
              onClick={() => generateLicensePDF(license)}
              className="h-14 px-8 rounded-2xl bg-white text-emerald-800 font-black text-base hover:bg-emerald-50 shadow-xl transition-all active:scale-95 flex items-center gap-3 whitespace-nowrap"
            >
              <Download className="h-5 w-5" />
              Descargar Certificado PDF
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
