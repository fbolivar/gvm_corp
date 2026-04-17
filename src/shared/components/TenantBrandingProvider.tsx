'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface TenantBranding {
  tenant_id: string
  tenant_name: string
  app_name: string | null
  logo_url: string | null
  favicon_url: string | null
  primary_color: string
  accent_color: string
  custom_domain: string | null
}

export function TenantBrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<TenantBranding | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.rpc('get_my_tenant_branding').then((res: { data: TenantBranding[] | null }) => {
      if (res.data && res.data.length > 0) {
        const b = res.data[0]
        setBranding(b)
        applyBranding(b)
      }
    })
  }, [])

  // Re-apply branding whenever it changes (for live preview)
  useEffect(() => {
    if (branding) applyBranding(branding)
  }, [branding])

  return <>{children}</>
}

function applyBranding(b: TenantBranding) {
  const root = document.documentElement

  if (b.primary_color) {
    root.style.setProperty('--tenant-primary', b.primary_color)
  }
  if (b.accent_color) {
    root.style.setProperty('--tenant-accent', b.accent_color)
  }

  // Update document title
  if (b.app_name) {
    document.title = b.app_name
  }

  // Update favicon if custom one exists
  if (b.favicon_url) {
    let favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']")
    if (!favicon) {
      favicon = document.createElement('link')
      favicon.rel = 'icon'
      document.head.appendChild(favicon)
    }
    favicon.href = b.favicon_url
  }
}
