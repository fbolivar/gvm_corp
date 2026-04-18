'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Shield, LogOut, ExternalLink, Settings } from 'lucide-react'
import { Toaster } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface PlatformConfig {
  master_logo_url: string | null
  master_favicon_url?: string | null
  company_name: string
}

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then((res: { data: { user: User | null } }) => setUser(res.data.user))
    supabase.rpc('get_platform_config').then((res: { data: PlatformConfig | PlatformConfig[] | null }) => {
      const data = Array.isArray(res.data) ? res.data[0] : res.data
      if (data) {
        setPlatformConfig(data)
        // Update favicon
        if (data.master_logo_url) {
          let favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']")
          if (!favicon) {
            favicon = document.createElement('link')
            favicon.rel = 'icon'
            document.head.appendChild(favicon)
          }
          favicon.href = data.master_logo_url
        }
        document.title = `${data.company_name} · Super Admin`
      }
    })
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center overflow-hidden">
              {platformConfig?.master_logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={platformConfig.master_logo_url}
                  alt="logo"
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <Shield className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="font-black text-lg leading-none tracking-tight">
                {platformConfig?.company_name?.toUpperCase() || 'BC FABRIC SAS'}
              </div>
              <div className="text-xs font-medium text-purple-200 uppercase tracking-widest mt-0.5">
                Consola Super Admin
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link
              href="/super-admin"
              className="px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/10 transition-colors"
            >
              Tenants
            </Link>
            <Link
              href="/super-admin/settings"
              className="px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/10 transition-colors flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              Configuración
            </Link>
            <a
              href="https://app.bc-security.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/10 transition-colors flex items-center gap-1.5"
            >
              App Clientes
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <div className="w-px h-6 bg-white/20 mx-2" />
            <div className="text-sm font-medium text-purple-100 hidden md:block">
              {user?.email}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-8 text-center text-xs text-slate-500 font-medium">
        BC Fabric SAS · Consola de administración de plataforma ·
        <span className="ml-1">
          {new Date().getFullYear()}
        </span>
      </footer>

      <Toaster richColors position="top-center" closeButton />
    </div>
  )
}
