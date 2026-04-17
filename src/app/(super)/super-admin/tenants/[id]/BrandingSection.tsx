'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Upload, Globe, Link as LinkIcon, Loader2, Save, Check } from 'lucide-react'
import {
  getTenantBrandingAction,
  updateTenantBrandingAction,
  uploadTenantLogoAction,
  type TenantBranding,
} from '@/features/super-admin/services/superAdminService'

const PRESET_COLORS = [
  { name: 'Índigo', primary: '#6366f1', accent: '#10b981' },
  { name: 'Azul', primary: '#2563eb', accent: '#f59e0b' },
  { name: 'Emerald', primary: '#10b981', accent: '#6366f1' },
  { name: 'Rose', primary: '#e11d48', accent: '#0ea5e9' },
  { name: 'Naranja', primary: '#f97316', accent: '#3b82f6' },
  { name: 'Púrpura', primary: '#9333ea', accent: '#f59e0b' },
  { name: 'Slate', primary: '#475569', accent: '#0ea5e9' },
  { name: 'Teal', primary: '#0d9488', accent: '#f59e0b' },
]

interface Props {
  tenantId: string
}

export function BrandingSection({ tenantId }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [form, setForm] = useState<TenantBranding>({
    slug: null,
    custom_domain: null,
    logo_url: null,
    favicon_url: null,
    primary_color: '#6366f1',
    accent_color: '#10b981',
    app_name: null,
  })

  useEffect(() => {
    getTenantBrandingAction(tenantId)
      .then(data => {
        if (data) setForm(data)
      })
      .finally(() => setLoading(false))
  }, [tenantId])

  const handleSave = async () => {
    setSaving(true)
    const res = await updateTenantBrandingAction(tenantId, form)
    setSaving(false)
    if (res.success) {
      toast.success('Marca y dominio actualizados')
    } else {
      toast.error(res.error || 'Error guardando cambios')
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo demasiado grande. Máximo 2MB.')
      return
    }
    setUploadingLogo(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      const res = await uploadTenantLogoAction(tenantId, base64, file.name)
      setUploadingLogo(false)
      if (res.success && res.url) {
        setForm(prev => ({ ...prev, logo_url: res.url! }))
        toast.success('Logo subido correctamente')
      } else {
        toast.error(res.error || 'Error subiendo logo')
      }
    }
    reader.readAsDataURL(file)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando configuración...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b-2 border-slate-100 bg-slate-50">
          <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">Vista Previa</h3>
        </div>
        <div
          className="p-6 text-white"
          style={{
            background: `linear-gradient(135deg, ${form.primary_color} 0%, ${form.accent_color} 100%)`,
          }}
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center overflow-hidden">
              {form.logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={form.logo_url} alt="logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-2xl font-black">{(form.app_name || 'App')[0]}</span>
              )}
            </div>
            <div>
              <div className="text-2xl font-black leading-tight">{form.app_name || 'Tu ERP'}</div>
              <div className="text-sm opacity-80">
                {form.custom_domain || `${form.slug || 'tenant'}.bc-security.com`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logo + App Name */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-600 mb-4">
          Identidad visual
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">
              Logo de la empresa
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                {form.logo_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={form.logo_url} alt="logo" className="w-full h-full object-contain" />
                ) : (
                  <Upload className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div className="flex-1">
                <label
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer ${
                    uploadingLogo
                      ? 'bg-slate-100 text-slate-400'
                      : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                  }`}
                >
                  {uploadingLogo ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploadingLogo ? 'Subiendo...' : 'Subir logo'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-slate-500 mt-1">PNG, JPG, SVG o WebP. Máximo 2MB.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">
              Nombre de la aplicación
            </label>
            <input
              type="text"
              value={form.app_name || ''}
              onChange={e => setForm(p => ({ ...p, app_name: e.target.value }))}
              placeholder="Ej: GVM Corp ERP"
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm focus:border-purple-500 focus:outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              El nombre que verá el cliente en su app (reemplaza &ldquo;GVM Corp&rdquo; por defecto).
            </p>
          </div>
        </div>
      </div>

      {/* Colores */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-600 mb-4">
          Paleta de colores
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">
              Color primario
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primary_color}
                onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))}
                className="w-12 h-12 rounded-xl border-2 border-slate-200 cursor-pointer"
              />
              <input
                type="text"
                value={form.primary_color}
                onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))}
                className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">
              Color de acento
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.accent_color}
                onChange={e => setForm(p => ({ ...p, accent_color: e.target.value }))}
                className="w-12 h-12 rounded-xl border-2 border-slate-200 cursor-pointer"
              />
              <input
                type="text"
                value={form.accent_color}
                onChange={e => setForm(p => ({ ...p, accent_color: e.target.value }))}
                className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-mono"
              />
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">
            Paletas predefinidas
          </div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {PRESET_COLORS.map(preset => (
              <button
                key={preset.name}
                type="button"
                onClick={() =>
                  setForm(p => ({ ...p, primary_color: preset.primary, accent_color: preset.accent }))
                }
                className="aspect-square rounded-xl overflow-hidden border-2 border-slate-200 hover:border-purple-400 transition-colors group relative"
                title={preset.name}
              >
                <div className="h-1/2" style={{ backgroundColor: preset.primary }} />
                <div className="h-1/2" style={{ backgroundColor: preset.accent }} />
                {form.primary_color === preset.primary && form.accent_color === preset.accent && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dominio */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-600 mb-4">
          Dirección de acceso
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5" />
              Subdominio en bc-security.com
            </label>
            <div className="flex items-center">
              <input
                type="text"
                value={form.slug || ''}
                onChange={e =>
                  setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))
                }
                placeholder="ej: gvm"
                className="flex-1 px-3 py-2 border-2 border-r-0 border-slate-200 rounded-l-xl text-sm font-mono focus:border-purple-500 focus:outline-none"
              />
              <span className="px-3 py-2 border-2 border-slate-200 rounded-r-xl bg-slate-50 text-sm text-slate-600 font-mono">
                .bc-security.com
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              URL completa: <code className="bg-slate-100 px-1 rounded">{form.slug || 'tenant'}.bc-security.com</code>
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              Dominio personalizado (opcional)
            </label>
            <input
              type="text"
              value={form.custom_domain || ''}
              onChange={e =>
                setForm(p => ({ ...p, custom_domain: e.target.value.toLowerCase().trim() }))
              }
              placeholder="erp.empresacliente.com"
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-mono focus:border-purple-500 focus:outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              El cliente apunta su dominio a <code className="bg-slate-100 px-1 rounded">76.76.21.21</code> y agregamos el dominio en Vercel.
            </p>
          </div>
        </div>

        {form.custom_domain && (
          <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl text-sm text-amber-900">
            <strong>Recordatorio:</strong> Antes de guardar, agrega <code className="bg-white px-1 rounded font-mono">{form.custom_domain}</code> al proyecto Vercel y pide al cliente crear un registro DNS:
            <div className="mt-2 font-mono text-xs bg-white p-2 rounded border border-amber-300">
              A {form.custom_domain.replace(/\..*$/, '')} 76.76.21.21
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold flex items-center gap-2 disabled:bg-slate-400"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar cambios
        </button>
      </div>
    </div>
  )
}
