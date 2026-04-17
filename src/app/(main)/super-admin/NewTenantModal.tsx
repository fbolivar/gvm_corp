'use client'

import { useState } from 'react'
import { X, Loader2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import {
  createTenantAction,
  type NewTenantInput,
  type CreateTenantResult,
} from '@/features/super-admin/services/superAdminService'

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

const PLAN_DEFAULTS: Record<string, { max_users: number; modules: string[] }> = {
  TRIAL: { max_users: 3, modules: ['dashboard', 'sales', 'inventory', 'settings'] },
  STARTER: { max_users: 5, modules: ['dashboard', 'sales', 'inventory', 'crm', 'settings'] },
  PROFESSIONAL: {
    max_users: 15,
    modules: ['dashboard', 'analytics', 'sales', 'inventory', 'crm', 'purchasing', 'accounting', 'settings'],
  },
  ENTERPRISE: { max_users: 50, modules: ALL_MODULES },
}

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export function NewTenantModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState<NewTenantInput>({
    company_name: '',
    nit: '',
    dv: '',
    admin_email: '',
    admin_full_name: '',
    plan: 'PROFESSIONAL',
    max_users: PLAN_DEFAULTS.PROFESSIONAL.max_users,
    modules_enabled: PLAN_DEFAULTS.PROFESSIONAL.modules,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CreateTenantResult | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const updatePlan = (plan: NewTenantInput['plan']) => {
    const defaults = PLAN_DEFAULTS[plan]
    setForm(prev => ({
      ...prev,
      plan,
      max_users: defaults.max_users,
      modules_enabled: defaults.modules,
    }))
  }

  const toggleModule = (module: string) => {
    setForm(prev => ({
      ...prev,
      modules_enabled: prev.modules_enabled.includes(module)
        ? prev.modules_enabled.filter(m => m !== module)
        : [...prev.modules_enabled, module],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company_name || !form.nit || !form.admin_email) {
      toast.error('Completa los campos obligatorios')
      return
    }
    setLoading(true)
    const res = await createTenantAction(form)
    setLoading(false)
    if (res.success) {
      setResult(res)
      toast.success('Tenant creado exitosamente')
    } else {
      toast.error(res.error || 'Error creando tenant')
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    toast.success(`${label} copiado`)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleDone = () => {
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b-2 border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900">
            {result ? 'Tenant creado ' : 'Nuevo Tenant'}
          </h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {result ? (
          <SuccessPanel
            result={result}
            onDone={handleDone}
            copied={copied}
            onCopy={copyToClipboard}
            form={form}
          />
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <section>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 mb-3">Empresa</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Nombre legal *"
                  value={form.company_name}
                  onChange={v => setForm(p => ({ ...p, company_name: v }))}
                  placeholder="EMPRESA CLIENTE S.A.S"
                />
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Field
                      label="NIT *"
                      value={form.nit}
                      onChange={v => setForm(p => ({ ...p, nit: v }))}
                      placeholder="900123456"
                    />
                  </div>
                  <Field
                    label="DV"
                    value={form.dv}
                    onChange={v => setForm(p => ({ ...p, dv: v }))}
                    placeholder="1"
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 mb-3">
                Usuario Administrador
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Email *"
                  type="email"
                  value={form.admin_email}
                  onChange={v => setForm(p => ({ ...p, admin_email: v }))}
                  placeholder="admin@empresa.co"
                />
                <Field
                  label="Nombre completo *"
                  value={form.admin_full_name}
                  onChange={v => setForm(p => ({ ...p, admin_full_name: v }))}
                  placeholder="Nombre Apellido"
                />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 mb-3">Plan y Licencia</h3>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {(['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => updatePlan(p)}
                    className={`px-3 py-2 rounded-xl text-sm font-bold border-2 ${
                      form.plan === p
                        ? 'border-purple-600 bg-purple-50 text-purple-900'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field
                  label="Max usuarios"
                  type="number"
                  value={String(form.max_users)}
                  onChange={v => setForm(p => ({ ...p, max_users: parseInt(v) || 0 }))}
                />
                <Field
                  label="Válida desde"
                  type="date"
                  value={form.valid_from}
                  onChange={v => setForm(p => ({ ...p, valid_from: v }))}
                />
                <Field
                  label="Válida hasta"
                  type="date"
                  value={form.valid_until}
                  onChange={v => setForm(p => ({ ...p, valid_until: v }))}
                />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 mb-3">
                Módulos habilitados ({form.modules_enabled.length}/{ALL_MODULES.length})
              </h3>
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
            </section>

            <div className="flex justify-end gap-3 pt-4 border-t-2 border-slate-100">
              <button
                type="button"
                onClick={onClose}
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
                Crear Tenant
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function Field({
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

function SuccessPanel({
  result,
  form,
  onDone,
  copied,
  onCopy,
}: {
  result: CreateTenantResult
  form: NewTenantInput
  onDone: () => void
  copied: string | null
  onCopy: (text: string, label: string) => void
}) {
  return (
    <div className="p-6 space-y-5">
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Check className="w-5 h-5 text-emerald-700" />
          <h3 className="font-black text-emerald-900">Tenant creado exitosamente</h3>
        </div>
        <p className="text-sm text-emerald-800">
          Guarda estos datos y entrégalos al cliente. El tenant ya está operativo.
        </p>
      </div>

      <CredentialRow
        label="Nombre"
        value={form.company_name}
        onCopy={() => onCopy(form.company_name, 'Nombre')}
        copied={copied === 'Nombre'}
      />
      <CredentialRow
        label="Licencia"
        value={result.license_key || '—'}
        mono
        onCopy={() => result.license_key && onCopy(result.license_key, 'Licencia')}
        copied={copied === 'Licencia'}
      />
      <CredentialRow
        label="Email Admin"
        value={form.admin_email}
        onCopy={() => onCopy(form.admin_email, 'Email')}
        copied={copied === 'Email'}
      />
      {result.admin_temp_password && (
        <CredentialRow
          label="Contraseña temporal"
          value={result.admin_temp_password}
          mono
          warning
          onCopy={() => result.admin_temp_password && onCopy(result.admin_temp_password, 'Contraseña')}
          copied={copied === 'Contraseña'}
        />
      )}
      {!result.admin_temp_password && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 text-sm text-amber-900">
          El email ya tenía una cuenta. El usuario conserva su contraseña actual.
        </div>
      )}

      <div className="flex justify-end pt-4 border-t-2 border-slate-100">
        <button
          type="button"
          onClick={onDone}
          className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-sm font-bold"
        >
          Listo
        </button>
      </div>
    </div>
  )
}

function CredentialRow({
  label,
  value,
  mono,
  warning,
  onCopy,
  copied,
}: {
  label: string
  value: string
  mono?: boolean
  warning?: boolean
  onCopy: () => void
  copied: boolean
}) {
  return (
    <div className={`rounded-xl p-3 border-2 ${warning ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">{label}</div>
      <div className="flex items-center justify-between gap-2">
        <code className={`${mono ? 'font-mono' : ''} text-sm text-slate-900 break-all`}>{value}</code>
        <button
          type="button"
          onClick={onCopy}
          className="p-2 hover:bg-white rounded-lg flex-shrink-0"
          title="Copiar"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4 text-slate-500" />}
        </button>
      </div>
    </div>
  )
}
