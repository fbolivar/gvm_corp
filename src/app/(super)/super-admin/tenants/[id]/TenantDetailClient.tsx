'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  Key,
  Users,
  BarChart3,
  Edit2,
  Trash2,
  RotateCcw,
  UserMinus,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  X,
  Loader2,
  Calendar,
  Shield,
  Package,
  FileText,
  UserCircle2,
  Palette,
  Activity,
  History,
  LogIn,
  Pencil,
  Plus,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  updateTenantAction,
  deleteTenantAction,
  resetUserPasswordAction,
  removeUserFromTenantAction,
  updateTenantLicenseAction,
  impersonateTenantAction,
  type TenantDetail,
  type TenantHealth,
  type LicenseHistoryRow,
} from '@/features/super-admin/services/superAdminService'
import { BrandingSection } from './BrandingSection'
import { HealthSection } from './HealthSection'
import { LicenseHistorySection } from './LicenseHistorySection'

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

interface Props {
  detail: TenantDetail
  health: TenantHealth | null
  licenseHistory: LicenseHistoryRow[]
}

type ActiveTab = 'info' | 'license' | 'users' | 'stats' | 'branding' | 'health' | 'history'

export function TenantDetailClient({ detail: initialDetail, health, licenseHistory }: Props) {
  const router = useRouter()
  const [detail, setDetail] = useState(initialDetail)
  const [activeTab, setActiveTab] = useState<ActiveTab>('info')
  const [impersonating, setImpersonating] = useState(false)

  const handleImpersonate = async () => {
    if (!confirm(`¿Entrar como admin del tenant "${detail.tenant.name}"?\n\nEsta acción queda registrada en el audit log.`)) return
    setImpersonating(true)
    const res = await impersonateTenantAction(detail.tenant.id)
    setImpersonating(false)
    if (!res.success || !res.url) {
      toast.error(res.error || 'No se pudo generar el acceso')
      return
    }
    window.open(res.url, '_blank', 'noopener,noreferrer')
    toast.success('Acceso generado — abriendo en nueva pestaña')
  }
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showLicenseModal, setShowLicenseModal] = useState(false)
  const [tempPassword, setTempPassword] = useState<{ userId: string; password: string } | null>(null)

  const licenseStatus = detail.license?.status ?? 'NONE'
  const isExpired = detail.license?.valid_until
    ? new Date(detail.license.valid_until) < new Date()
    : false

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top header bar */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <button
            type="button"
            onClick={() => router.push('/super-admin')}
            className="flex items-center gap-2 text-purple-200 hover:text-white text-sm font-bold mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al panel
          </button>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-black tracking-tight">{detail.tenant.name}</h1>
              </div>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-purple-200 text-sm font-mono">NIT: {detail.tenant.nit}{detail.tenant.dv ? `-${detail.tenant.dv}` : ''}</span>
                <StatusBadge status={licenseStatus} isExpired={isExpired} />
                <PlanBadge plan={detail.license?.plan ?? 'NONE'} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleImpersonate}
                disabled={impersonating}
                className="px-4 py-2 bg-emerald-500/90 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
                title="Entrar como admin del tenant (quedará registrado)"
              >
                {impersonating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                Impersonar
              </button>
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Editar
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b-2 border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-0">
            {(
              [
                { key: 'info', label: 'Información', icon: Building2 },
                { key: 'health', label: 'Salud', icon: Activity },
                { key: 'license', label: 'Licencia', icon: Key },
                { key: 'history', label: 'Historial', icon: History },
                { key: 'branding', label: 'Marca & Dominio', icon: Palette },
                { key: 'users', label: `Usuarios (${detail.users.length})`, icon: Users },
                { key: 'stats', label: 'Estadísticas', icon: BarChart3 },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-bold border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'info' && (
          <InfoSection detail={detail} onEdit={() => setShowEditModal(true)} />
        )}
        {activeTab === 'license' && (
          <LicenseSection
            detail={detail}
            onEditLicense={() => setShowLicenseModal(true)}
          />
        )}
        {activeTab === 'users' && (
          <UsersSection
            detail={detail}
            onPasswordReset={(userId, password) => setTempPassword({ userId, password })}
            onUserRemoved={() => router.refresh()}
          />
        )}
        {activeTab === 'stats' && <StatsSection detail={detail} />}
        {activeTab === 'branding' && <BrandingSection tenantId={detail.tenant.id} />}
        {activeTab === 'health' && <HealthSection health={health} />}
        {activeTab === 'history' && <LicenseHistorySection history={licenseHistory} />}
      </div>

      {/* Modals */}
      {showEditModal && (
        <EditTenantModal
          detail={detail}
          onClose={() => setShowEditModal(false)}
          onSuccess={(updated) => {
            setDetail(prev => ({ ...prev, tenant: { ...prev.tenant, ...updated } }))
            setShowEditModal(false)
            router.refresh()
          }}
        />
      )}

      {showDeleteModal && (
        <DeleteTenantModal
          detail={detail}
          onClose={() => setShowDeleteModal(false)}
          onSuccess={() => {
            toast.success('Tenant eliminado permanentemente')
            router.push('/super-admin')
          }}
        />
      )}

      {showLicenseModal && detail.license && (
        <EditLicenseModal
          tenantId={detail.tenant.id}
          license={detail.license}
          onClose={() => setShowLicenseModal(false)}
          onSuccess={() => {
            setShowLicenseModal(false)
            router.refresh()
          }}
        />
      )}

      {tempPassword && (
        <TempPasswordModal
          email={detail.users.find(u => u.id === tempPassword.userId)?.email ?? ''}
          password={tempPassword.password}
          onClose={() => setTempPassword(null)}
        />
      )}
    </div>
  )
}

// ─── Info Section ─────────────────────────────────────────────────────────────

function InfoSection({ detail, onEdit }: { detail: TenantDetail; onEdit: () => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">
            Datos de la Empresa
          </h2>
          <button
            type="button"
            onClick={onEdit}
            aria-label="Editar datos de la empresa"
            title="Editar"
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-700 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
        <dl className="space-y-4">
          <InfoRow label="Nombre legal" value={detail.tenant.name} />
          <InfoRow label="NIT" value={detail.tenant.nit || '—'} mono />
          <InfoRow label="Digito de verificacion" value={detail.tenant.dv || '—'} mono />
          <InfoRow
            label="Fecha de creacion"
            value={new Date(detail.tenant.created_at).toLocaleDateString('es-CO', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          />
          <InfoRow label="ID del tenant" value={detail.tenant.id} mono small />
        </dl>
      </div>

      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 mb-5">
          Resumen
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <MiniStat label="Usuarios" value={detail.users.length} icon={Users} color="purple" />
          <MiniStat label="Documentos" value={detail.stats.total_documents} icon={FileText} color="blue" />
          <MiniStat label="Terceros" value={detail.stats.total_parties} icon={UserCircle2} color="emerald" />
          <MiniStat label="Productos" value={detail.stats.total_products} icon={Package} color="amber" />
        </div>
      </div>
    </div>
  )
}

// ─── License Section ──────────────────────────────────────────────────────────

function LicenseSection({
  detail,
  onEditLicense,
}: {
  detail: TenantDetail
  onEditLicense: () => void
}) {
  const license = detail.license

  if (!license) {
    return (
      <div className="bg-white border-2 border-red-200 rounded-2xl p-10 text-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <h3 className="font-black text-slate-900 mb-1">Sin licencia activa</h3>
        <p className="text-sm text-slate-500">Este tenant no tiene licencia asignada.</p>
      </div>
    )
  }

  const isExpired = new Date(license.valid_until) < new Date()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">
            Detalle de Licencia
          </h2>
          <button
            type="button"
            onClick={onEditLicense}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Editar licencia
          </button>
        </div>
        <dl className="space-y-4">
          <InfoRow label="Clave de licencia" value={license.license_key} mono />
          <InfoRow label="Plan" value={license.plan} />
          <InfoRow label="Estado" value={license.status} />
          <InfoRow
            label="Valida desde"
            value={new Date(license.valid_from).toLocaleDateString('es-CO')}
          />
          <InfoRow
            label="Valida hasta"
            value={new Date(license.valid_until).toLocaleDateString('es-CO')}
            highlight={isExpired ? 'red' : undefined}
          />
          <InfoRow label="Max usuarios" value={String(license.max_users)} />
          <InfoRow
            label="Activada"
            value={
              license.activated_at
                ? new Date(license.activated_at).toLocaleDateString('es-CO')
                : 'Pendiente'
            }
          />
          <InfoRow label="Emitida por" value={license.issued_by || '—'} small />
        </dl>
      </div>

      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 mb-5">
          Modulos habilitados ({license.modules_enabled.length})
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {ALL_MODULES.map(m => {
            const enabled = license.modules_enabled.includes(m)
            return (
              <div
                key={m}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  enabled
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-slate-50 text-slate-400'
                }`}
              >
                {enabled ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                )}
                <span className="capitalize">{m}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Users Section ────────────────────────────────────────────────────────────

function UsersSection({
  detail,
  onPasswordReset,
  onUserRemoved,
}: {
  detail: TenantDetail
  onPasswordReset: (userId: string, password: string) => void
  onUserRemoved: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null)

  const handleResetPassword = (userId: string) => {
    setLoadingUserId(userId)
    startTransition(async () => {
      const result = await resetUserPasswordAction(userId, detail.tenant.id)
      setLoadingUserId(null)
      if (result.success && result.tempPassword) {
        onPasswordReset(userId, result.tempPassword)
      } else {
        toast.error(result.error || 'Error reseteando contrasena')
      }
    })
  }

  const handleRemoveUser = (userId: string, email: string) => {
    if (!confirm(`Remover a "${email}" de este tenant?`)) return
    setLoadingUserId(userId + '-remove')
    startTransition(async () => {
      const result = await removeUserFromTenantAction(userId, detail.tenant.id)
      setLoadingUserId(null)
      if (result.success) {
        toast.success('Usuario removido del tenant')
        onUserRemoved()
      } else {
        toast.error(result.error || 'Error removiendo usuario')
      }
    })
  }

  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b-2 border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">
          Usuarios del Tenant
        </h2>
        <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">
          {detail.users.length} usuarios
        </span>
      </div>

      {detail.users.length === 0 ? (
        <div className="px-6 py-12 text-center text-slate-400 text-sm">
          No hay usuarios en este tenant
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-6 py-3 text-xs font-black uppercase tracking-wide text-slate-600">Email</th>
              <th className="px-6 py-3 text-xs font-black uppercase tracking-wide text-slate-600">Nombre</th>
              <th className="px-6 py-3 text-xs font-black uppercase tracking-wide text-slate-600">Rol</th>
              <th className="px-6 py-3 text-xs font-black uppercase tracking-wide text-slate-600">Estado</th>
              <th className="px-6 py-3 text-xs font-black uppercase tracking-wide text-slate-600">Ingreso</th>
              <th className="px-6 py-3 text-xs font-black uppercase tracking-wide text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {detail.users.map(u => {
              const isLoadingReset = loadingUserId === u.id
              const isLoadingRemove = loadingUserId === u.id + '-remove'
              return (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-900">{u.email}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {u.full_name || <span className="text-slate-300 italic">Sin nombre</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-md">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-bold rounded-md ${
                        u.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {new Date(u.joined_at).toLocaleDateString('es-CO')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isLoadingReset || isLoadingRemove || pending}
                        onClick={() => handleResetPassword(u.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                        title="Resetear contrasena"
                      >
                        {isLoadingReset ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        Reset
                      </button>
                      <button
                        type="button"
                        disabled={isLoadingReset || isLoadingRemove || pending}
                        onClick={() => handleRemoveUser(u.id, u.email)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                        title="Remover del tenant"
                      >
                        {isLoadingRemove ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserMinus className="w-3.5 h-3.5" />
                        )}
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── Stats Section ────────────────────────────────────────────────────────────

function StatsSection({ detail }: { detail: TenantDetail }) {
  const stats = [
    { label: 'Documentos', value: detail.stats.total_documents, icon: FileText, color: 'blue' },
    { label: 'Terceros', value: detail.stats.total_parties, icon: UserCircle2, color: 'emerald' },
    { label: 'Productos', value: detail.stats.total_products, icon: Package, color: 'amber' },
    { label: 'Empleados', value: detail.stats.total_employees, icon: Users, color: 'purple' },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  }

  const iconColorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    purple: 'bg-purple-100 text-purple-700',
  }

  return (
    <div>
      <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 mb-5">
        Uso de la Plataforma
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className={`bg-white border-2 rounded-2xl p-6 ${colorMap[color]}`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${iconColorMap[color]}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="text-4xl font-black text-slate-900 leading-none">{value.toLocaleString()}</div>
            <div className="text-xs font-bold uppercase tracking-wide mt-2 opacity-70">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function EditTenantModal({
  detail,
  onClose,
  onSuccess,
}: {
  detail: TenantDetail
  onClose: () => void
  onSuccess: (updated: { name: string; nit: string; dv: string }) => void
}) {
  const [form, setForm] = useState({
    name: detail.tenant.name,
    nit: detail.tenant.nit,
    dv: detail.tenant.dv ?? '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    setLoading(true)
    const result = await updateTenantAction(detail.tenant.id, form)
    setLoading(false)
    if (result.success) {
      toast.success('Tenant actualizado')
      onSuccess(form)
    } else {
      toast.error(result.error || 'Error actualizando tenant')
    }
  }

  return (
    <ModalWrapper title="Editar Tenant" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <ModalField
          label="Nombre legal *"
          value={form.name}
          onChange={v => setForm(p => ({ ...p, name: v }))}
          placeholder="EMPRESA S.A.S"
        />
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <ModalField
              label="NIT"
              value={form.nit}
              onChange={v => setForm(p => ({ ...p, nit: v }))}
              placeholder="900123456"
            />
          </div>
          <ModalField
            label="DV"
            value={form.dv}
            onChange={v => setForm(p => ({ ...p, dv: v }))}
            placeholder="1"
          />
        </div>
        <ModalActions loading={loading} onCancel={onClose} submitLabel="Guardar cambios" />
      </form>
    </ModalWrapper>
  )
}

function DeleteTenantModal({
  detail,
  onClose,
  onSuccess,
}: {
  detail: TenantDetail
  onClose: () => void
  onSuccess: () => void
}) {
  const [confirmNit, setConfirmNit] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    const result = await deleteTenantAction(detail.tenant.id, confirmNit)
    setLoading(false)
    if (result.success) {
      onSuccess()
    } else {
      toast.error(result.error || 'Error eliminando tenant')
    }
  }

  const canDelete = confirmNit === detail.tenant.nit

  return (
    <ModalWrapper title="Eliminar Tenant" onClose={onClose}>
      <div className="p-6 space-y-5">
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-red-900 mb-1">Accion irreversible</p>
              <p className="text-sm text-red-800">
                Esta accion eliminara permanentemente el tenant{' '}
                <strong>{detail.tenant.name}</strong> y TODOS sus datos, incluyendo
                documentos, usuarios, productos, inventario, contabilidad y licencias.
                Esta operacion no se puede deshacer.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-wide text-slate-700 mb-2">
            Confirma el NIT del tenant para continuar
          </label>
          <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3 mb-3">
            <p className="text-xs text-slate-500 mb-1">NIT del tenant:</p>
            <code className="text-base font-black font-mono text-slate-900">{detail.tenant.nit}</code>
          </div>
          <input
            type="text"
            value={confirmNit}
            onChange={e => setConfirmNit(e.target.value)}
            placeholder={`Escribe: ${detail.tenant.nit}`}
            className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-mono focus:border-red-400 focus:outline-none"
          />
          {confirmNit.length > 0 && !canDelete && (
            <p className="text-xs text-red-600 mt-1 font-medium">El NIT no coincide</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t-2 border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canDelete || loading}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Trash2 className="w-4 h-4" />
            Eliminar permanentemente
          </button>
        </div>
      </div>
    </ModalWrapper>
  )
}

function EditLicenseModal({
  tenantId,
  license,
  onClose,
  onSuccess,
}: {
  tenantId: string
  license: NonNullable<TenantDetail['license']>
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    plan: license.plan,
    status: license.status,
    valid_until: license.valid_until.split('T')[0],
    max_users: license.max_users,
    modules_enabled: [...license.modules_enabled],
  })
  const [loading, setLoading] = useState(false)

  const toggleModule = (m: string) => {
    setForm(prev => ({
      ...prev,
      modules_enabled: prev.modules_enabled.includes(m)
        ? prev.modules_enabled.filter(x => x !== m)
        : [...prev.modules_enabled, m],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const result = await updateTenantLicenseAction(tenantId, form)
    setLoading(false)
    if (result.success) {
      toast.success('Licencia actualizada')
      onSuccess()
    } else {
      toast.error(result.error || 'Error actualizando licencia')
    }
  }

  return (
    <ModalWrapper title="Editar Licencia" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="lic-plan" className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">Plan</label>
            <select
              id="lic-plan"
              value={form.plan}
              onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none"
            >
              {['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="lic-status" className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">Estado</label>
            <select
              id="lic-status"
              value={form.status}
              onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none"
            >
              {['ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ModalField
            label="Valida hasta"
            type="date"
            value={form.valid_until}
            onChange={v => setForm(p => ({ ...p, valid_until: v }))}
          />
          <ModalField
            label="Max usuarios"
            type="number"
            value={String(form.max_users)}
            onChange={v => setForm(p => ({ ...p, max_users: parseInt(v) || 0 }))}
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-3">
            Modulos ({form.modules_enabled.length}/{ALL_MODULES.length})
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {ALL_MODULES.map(m => (
              <label
                key={m}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={form.modules_enabled.includes(m)}
                  onChange={() => toggleModule(m)}
                  className="rounded"
                />
                <span className="text-sm text-slate-700 capitalize">{m}</span>
              </label>
            ))}
          </div>
        </div>

        <ModalActions loading={loading} onCancel={onClose} submitLabel="Guardar licencia" />
      </form>
    </ModalWrapper>
  )
}

function TempPasswordModal({
  email,
  password,
  onClose,
}: {
  email: string
  password: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(password)
    setCopied(true)
    toast.success('Contrasena copiada')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <ModalWrapper title="Contrasena temporal generada" onClose={onClose}>
      <div className="p-6 space-y-4">
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
          <p className="text-sm text-amber-900">
            Se ha generado una nueva contrasena temporal para{' '}
            <strong>{email}</strong>. Comparte esta contrasena de forma segura y solicita
            al usuario que la cambie inmediatamente.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">
            Contrasena temporal
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-slate-900 text-emerald-400 font-mono text-sm px-4 py-3 rounded-xl tracking-widest">
              {password}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t-2 border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-sm font-bold"
          >
            Listo
          </button>
        </div>
      </div>
    </ModalWrapper>
  )
}

// ─── Shared Modal Primitives ──────────────────────────────────────────────────

function ModalWrapper({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b-2 border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            title="Cerrar"
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ModalField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none"
      />
    </div>
  )
}

function ModalActions({
  loading,
  onCancel,
  submitLabel,
}: {
  loading: boolean
  onCancel: () => void
  submitLabel: string
}) {
  return (
    <div className="flex justify-end gap-3 pt-4 border-t-2 border-slate-100">
      <button
        type="button"
        onClick={onCancel}
        className="px-5 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={loading}
        className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-sm font-bold flex items-center gap-2 disabled:bg-slate-400"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitLabel}
      </button>
    </div>
  )
}

// ─── Utility display components ───────────────────────────────────────────────

function InfoRow({
  label,
  value,
  mono,
  small,
  highlight,
}: {
  label: string
  value: string
  mono?: boolean
  small?: boolean
  highlight?: 'red'
}) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-0.5">{label}</dt>
      <dd
        className={`${mono ? 'font-mono' : ''} ${small ? 'text-xs' : 'text-sm'} font-medium ${
          highlight === 'red' ? 'text-red-600 font-bold' : 'text-slate-900'
        } break-all`}
      >
        {value}
      </dd>
    </div>
  )
}

function MiniStat({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: 'purple' | 'blue' | 'emerald' | 'amber'
}) {
  const colorMap = {
    purple: 'bg-purple-100 text-purple-700',
    blue: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
  }
  return (
    <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div>
        <div className="text-xl font-black text-slate-900 leading-none">{value}</div>
        <div className="text-xs font-medium text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  )
}

function StatusBadge({ status, isExpired }: { status: string; isExpired: boolean }) {
  if (isExpired) {
    return (
      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-red-400/30 text-red-100 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        EXPIRADA
      </span>
    )
  }
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-400/30 text-emerald-100',
    EXPIRED: 'bg-red-400/30 text-red-100',
    SUSPENDED: 'bg-amber-400/30 text-amber-100',
    CANCELLED: 'bg-slate-400/30 text-slate-200',
    NONE: 'bg-red-400/30 text-red-100',
  }
  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${map[status] || 'bg-slate-400/30 text-slate-200'}`}>
      {status}
    </span>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, string> = {
    ENTERPRISE: 'bg-purple-400/30 text-purple-100',
    PROFESSIONAL: 'bg-blue-400/30 text-blue-100',
    STARTER: 'bg-slate-400/30 text-slate-200',
    TRIAL: 'bg-amber-400/30 text-amber-100',
    NONE: 'bg-red-400/30 text-red-100',
  }
  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 ${map[plan] || 'bg-slate-400/30 text-slate-200'}`}>
      <Shield className="w-3 h-3" />
      {plan}
    </span>
  )
}
