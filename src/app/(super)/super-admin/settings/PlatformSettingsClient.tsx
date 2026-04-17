'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload, Loader2, Save, Building2, Mail, Phone, Globe, FileText } from 'lucide-react'
import {
  updatePlatformConfigAction,
  uploadPlatformLogoAction,
  type PlatformConfig,
} from '@/features/super-admin/services/superAdminService'

interface Props {
  config: PlatformConfig | null
}

export function PlatformSettingsClient({ config: initialConfig }: Props) {
  const router = useRouter()
  const [config, setConfig] = useState<PlatformConfig>(
    initialConfig || {
      id: '',
      master_logo_url: null,
      master_favicon_url: null,
      company_name: 'BC Fabric SAS',
      legal_name: 'BC FABRIC S.A.S',
      tax_id: null,
      support_email: 'soporte@bc-security.com',
      support_phone: null,
      website: 'https://bc-security.com',
    }
  )
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const res = await updatePlatformConfigAction({
      company_name: config.company_name,
      legal_name: config.legal_name,
      tax_id: config.tax_id,
      support_email: config.support_email,
      support_phone: config.support_phone,
      website: config.website,
    })
    setSaving(false)
    if (res.success) {
      toast.success('Configuración guardada')
      router.refresh()
    } else {
      toast.error(res.error || 'Error guardando')
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Máximo 2MB')
      return
    }
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      const res = await uploadPlatformLogoAction(base64, file.name)
      setUploading(false)
      if (res.success && res.url) {
        setConfig(prev => ({ ...prev, master_logo_url: res.url! }))
        toast.success('Logo master subido')
        router.refresh()
      } else {
        toast.error(res.error || 'Error subiendo logo')
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-4xl mx-auto mb-8">
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
          Configuración de Plataforma
        </h1>
        <p className="text-sm text-slate-500 mt-2 font-medium max-w-2xl">
          Logo master, datos fiscales y contacto de soporte de BC Fabric SAS. Aparecen en
          el panel Super Admin, certificados de licencia y comunicaciones a los clientes.
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Master Logo */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-700 mb-4">
            Logo Master
          </h3>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center overflow-hidden">
              {config.master_logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={config.master_logo_url}
                  alt="BC Fabric"
                  className="w-20 h-20 object-contain"
                />
              ) : (
                <span className="text-3xl font-black text-white">BC</span>
              )}
            </div>
            <div>
              <label
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer ${
                  uploading
                    ? 'bg-slate-100 text-slate-400'
                    : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                }`}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploading ? 'Subiendo...' : 'Subir logo master'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-slate-500 mt-2">
                PNG, JPG, SVG o WebP. Máximo 2MB. Visible en super admin + certificados de licencia.
              </p>
            </div>
          </div>
        </div>

        {/* Empresa */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-700 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Datos de la empresa
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Nombre comercial"
              value={config.company_name}
              onChange={v => setConfig(p => ({ ...p, company_name: v }))}
              icon={Building2}
            />
            <Field
              label="Razón social"
              value={config.legal_name}
              onChange={v => setConfig(p => ({ ...p, legal_name: v }))}
              icon={FileText}
            />
            <Field
              label="NIT / Tax ID"
              value={config.tax_id || ''}
              onChange={v => setConfig(p => ({ ...p, tax_id: v || null }))}
              placeholder="900123456-7"
              icon={FileText}
            />
            <Field
              label="Sitio web"
              value={config.website || ''}
              onChange={v => setConfig(p => ({ ...p, website: v }))}
              placeholder="https://..."
              icon={Globe}
            />
          </div>
        </div>

        {/* Contacto */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-700 mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Contacto de soporte
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Email soporte"
              type="email"
              value={config.support_email}
              onChange={v => setConfig(p => ({ ...p, support_email: v }))}
              icon={Mail}
            />
            <Field
              label="Teléfono"
              value={config.support_phone || ''}
              onChange={v => setConfig(p => ({ ...p, support_phone: v || null }))}
              placeholder="+57 300 000 0000"
              icon={Phone}
            />
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold flex items-center gap-2 disabled:bg-slate-400"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </button>
        </div>
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
  icon: Icon,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {Icon && <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full ${Icon ? 'pl-9' : 'pl-3'} pr-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none`}
        />
      </div>
    </div>
  )
}
