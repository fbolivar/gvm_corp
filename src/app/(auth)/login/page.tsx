import { cache } from 'react'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { Fingerprint, Cpu, Radio, Shield } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getTenantByHost()
  const platformConfig = await getPlatformConfig()

  const appName = branding?.app_name || branding?.tenant_name || platformConfig?.company_name || 'BC Fabric SAS'
  const iconUrl = branding?.favicon_url || branding?.logo_url || platformConfig?.master_logo_url

  return {
    title: `${appName} · Login`,
    icons: iconUrl ? { icon: iconUrl } : undefined,
  }
}

interface TenantBranding {
  tenant_id: string
  tenant_name: string
  slug: string | null
  app_name: string | null
  logo_url: string | null
  favicon_url: string | null
  primary_color: string
  accent_color: string
}

// React.cache deduplica dentro del mismo request: generateMetadata + page
// comparten 1 sola RPC en vez de ejecutarla 2 veces.
const getTenantByHost = cache(async (): Promise<TenantBranding | null> => {
  const h = await headers()
  const hostname = (h.get('host') || '').toLowerCase().split(':')[0]

  if (
    !hostname ||
    hostname.startsWith('admin.bc-security.com') ||
    hostname.startsWith('app.bc-security.com') ||
    hostname.endsWith('.vercel.app') ||
    hostname.startsWith('localhost')
  ) {
    return null
  }

  let lookupKey = hostname
  if (hostname.endsWith('.bc-security.com')) {
    lookupKey = hostname.replace('.bc-security.com', '')
  }

  const supabase = await createClient()
  const { data } = await supabase
    .rpc('get_tenant_by_domain', { p_domain: lookupKey })
    .maybeSingle<TenantBranding>()

  return data || null
})

interface PlatformConfig {
  master_logo_url: string | null
  company_name: string
  legal_name: string
}

const getPlatformConfig = cache(async (): Promise<PlatformConfig | null> => {
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_platform_config').maybeSingle<PlatformConfig>()
  return data
})

export default async function LoginPage() {
  const branding = await getTenantByHost()
  const h = await headers()
  const hostname = (h.get('host') || '').toLowerCase().split(':')[0]
  const isAdminHost = hostname.startsWith('admin.bc-security.com')
  const isAppHost = hostname.startsWith('app.bc-security.com')
  const platformConfig = isAppHost || !branding ? await getPlatformConfig() : null

  // Super Admin (BC Fabric) login — minimalista
  if (isAdminHost) {
    const platformCfg = await getPlatformConfig()
    const masterLogo = platformCfg?.master_logo_url
    const companyName = platformCfg?.company_name || 'BC Fabric'

    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="w-full max-w-sm">
          {/* Logo + nombre */}
          <div className="flex flex-col items-center mb-10">
            {masterLogo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={masterLogo}
                alt={companyName}
                className="h-10 w-auto object-contain mb-4"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center mb-4">
                <Shield className="h-5 w-5 text-white" />
              </div>
            )}
            <h1 className="text-base font-semibold text-slate-900">{companyName}</h1>
            <p className="text-xs text-slate-500 mt-1">Consola de administración</p>
          </div>

          {/* Formulario */}
          <LoginForm />

          {/* Footer */}
          <p className="text-[11px] text-slate-400 text-center mt-8">
            Acceso restringido · Solo personal autorizado
          </p>
        </div>
      </div>
    )
  }

  // Tenant-specific login (with branding) OR generic app login (using platform config)
  const isTenantBranded = branding !== null
  const primary = branding?.primary_color || '#4f46e5'
  const accent = branding?.accent_color || '#10b981'
  const appName =
    branding?.app_name ||
    branding?.tenant_name ||
    platformConfig?.company_name ||
    'BC Fabric SAS'
  const logoUrl = branding?.logo_url || platformConfig?.master_logo_url || null
  const isGeneric = !isTenantBranded && isAppHost

  return (
    <div className="relative min-h-screen flex">
      {/* ═══════════ LEFT PANEL: Brand Identity ═══════════ */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-between p-16 relative overflow-hidden"
        style={{
          background: isTenantBranded
            ? `linear-gradient(135deg, ${primary}05 0%, ${accent}08 100%)`
            : undefined,
          backgroundColor: !isTenantBranded ? '#f8fafc' : undefined,
        }}
      >
        <div className="absolute bottom-0 right-0 opacity-[0.04] pointer-events-none">
          <Cpu className="h-[500px] w-[500px] text-slate-900" />
        </div>
        <div className="absolute top-20 right-20 opacity-[0.08] pointer-events-none">
          <Radio className="h-48 w-48 animate-pulse" style={{ color: primary }} />
        </div>

        {/* Logo */}
        <div className="flex items-center gap-4 relative z-10">
          <div className="h-14 w-14 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={logoUrl} alt={appName} className="w-10 h-10 object-contain" />
            ) : (
              <Image
                src="/logo-gvm.png"
                alt={appName}
                width={36}
                height={36}
                className="rounded-lg w-auto h-auto"
                unoptimized
              />
            )}
          </div>
          <div>
            <p className="text-slate-900 font-black italic text-xl tracking-tighter">{appName}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">
              {isGeneric ? 'Plataforma ERP Multi-Tenant' : 'Enterprise ERP · Powered by BC Fabric'}
            </p>
          </div>
        </div>

        {/* Hero Text */}
        <div className="space-y-8 relative z-10 max-w-xl">
          <h1 className="text-6xl xl:text-7xl font-black text-slate-900 tracking-tighter italic uppercase leading-[0.9]">
            Centro de
            <br />
            <span
              className="text-transparent bg-clip-text"
              style={{
                backgroundImage: `linear-gradient(90deg, ${primary}, ${accent}, ${primary})`,
              }}
            >
              Acceso Seguro
            </span>
          </h1>
        </div>

        {/* Bottom Security Badge */}
        <div className="flex items-center gap-3 relative z-10">
          <div
            className="h-2 w-2 rounded-full animate-pulse"
            style={{
              backgroundColor: accent,
              boxShadow: `0 0 8px ${accent}66`,
            }}
          />
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em] italic">
            Secure Enterprise Cloud — Encriptación AES-256
          </p>
        </div>
      </div>

      {/* ═══════════ RIGHT PANEL: Login Form ═══════════ */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-md flex flex-col items-center gap-10">
          {/* Mobile-only logo */}
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={logoUrl} alt={appName} className="w-8 h-8 object-contain" />
              ) : (
                <Image
                  src="/logo-gvm.png"
                  alt={appName}
                  width={32}
                  height={32}
                  className="rounded-lg w-auto h-auto"
                  unoptimized
                />
              )}
            </div>
            <div>
              <p className="text-slate-900 font-black italic text-lg tracking-tighter">{appName}</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                {isGeneric ? 'Plataforma Multi-Tenant' : 'Centro de Acceso'}
              </p>
            </div>
          </div>

          <LoginForm />

          {/* Footer */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-4 opacity-20">
              <div className="h-px w-12 bg-slate-900" />
              <Fingerprint className="h-4 w-4 text-slate-900" />
              <div className="h-px w-12 bg-slate-900" />
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">
              Secure Enterprise Cloud • {appName} © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
