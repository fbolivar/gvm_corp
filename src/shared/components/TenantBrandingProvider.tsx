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
  const [, setBranding] = useState<TenantBranding | null>(null)

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

  return <>{children}</>
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h *= 60
  }

  return { h, s: s * 100, l: l * 100 }
}

function shade(hex: string, lightness: number): string {
  const { h, s } = hexToHsl(hex)
  return `hsl(${h.toFixed(0)}, ${s.toFixed(0)}%, ${lightness}%)`
}

function applyBranding(b: TenantBranding) {
  const root = document.documentElement
  const primary = b.primary_color || '#6366f1'
  const accent = b.accent_color || '#10b981'

  // Set CSS variables
  root.style.setProperty('--tenant-primary', primary)
  root.style.setProperty('--tenant-accent', accent)

  // Build shades for the primary color
  const primary50 = shade(primary, 96)
  const primary100 = shade(primary, 92)
  const primary500 = shade(primary, 55)
  const primary600 = primary
  const primary700 = shade(primary, 42)
  const primary800 = shade(primary, 32)
  const primary900 = shade(primary, 22)

  // Override common indigo/blue/purple classes used throughout the app
  const styleId = 'tenant-branding-overrides'
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = styleId
    document.head.appendChild(styleEl)
  }

  styleEl.textContent = `
    .bg-indigo-50, .bg-blue-50 { background-color: ${primary50} !important; }
    .bg-indigo-100, .bg-blue-100 { background-color: ${primary100} !important; }
    .bg-indigo-500, .bg-blue-500 { background-color: ${primary500} !important; }
    .bg-indigo-600, .bg-blue-600 { background-color: ${primary600} !important; }
    .bg-indigo-700, .bg-blue-700 { background-color: ${primary700} !important; }
    .bg-indigo-800, .bg-blue-800 { background-color: ${primary800} !important; }
    .bg-indigo-900, .bg-blue-900 { background-color: ${primary900} !important; }

    .text-indigo-50, .text-blue-50 { color: ${primary50} !important; }
    .text-indigo-500, .text-blue-500 { color: ${primary500} !important; }
    .text-indigo-600, .text-blue-600 { color: ${primary600} !important; }
    .text-indigo-700, .text-blue-700 { color: ${primary700} !important; }
    .text-indigo-800, .text-blue-800 { color: ${primary800} !important; }
    .text-indigo-900, .text-blue-900 { color: ${primary900} !important; }

    .border-indigo-100, .border-blue-100 { border-color: ${primary100} !important; }
    .border-indigo-500, .border-blue-500 { border-color: ${primary500} !important; }
    .border-indigo-600, .border-blue-600 { border-color: ${primary600} !important; }
    .border-indigo-700, .border-blue-700 { border-color: ${primary700} !important; }

    .hover\\:bg-indigo-50:hover, .hover\\:bg-blue-50:hover { background-color: ${primary50} !important; }
    .hover\\:bg-indigo-100:hover, .hover\\:bg-blue-100:hover { background-color: ${primary100} !important; }
    .hover\\:bg-indigo-600:hover, .hover\\:bg-blue-600:hover { background-color: ${primary600} !important; }
    .hover\\:bg-indigo-700:hover, .hover\\:bg-blue-700:hover { background-color: ${primary700} !important; }
    .hover\\:text-indigo-600:hover, .hover\\:text-blue-600:hover { color: ${primary600} !important; }
    .hover\\:text-indigo-700:hover, .hover\\:text-blue-700:hover { color: ${primary700} !important; }

    .ring-indigo-500 { --tw-ring-color: ${primary500} !important; }
    .ring-indigo-600 { --tw-ring-color: ${primary600} !important; }
    .focus\\:border-indigo-500:focus { border-color: ${primary500} !important; }
    .focus\\:ring-indigo-500:focus { --tw-ring-color: ${primary500} !important; }

    .from-indigo-600, .from-blue-600 { --tw-gradient-from: ${primary600} var(--tw-gradient-from-position) !important; }
    .to-indigo-600, .to-blue-600 { --tw-gradient-to: ${primary600} var(--tw-gradient-to-position) !important; }
    .from-indigo-700, .from-blue-700 { --tw-gradient-from: ${primary700} var(--tw-gradient-from-position) !important; }
    .to-indigo-700, .to-blue-700 { --tw-gradient-to: ${primary700} var(--tw-gradient-to-position) !important; }

    .shadow-indigo-100 { --tw-shadow-color: ${primary100} !important; --tw-shadow: var(--tw-shadow-colored) !important; }

    .decoration-indigo-600 { text-decoration-color: ${primary600} !important; }

    /* Accent overrides for emerald class (commonly used as secondary CTA) */
    .bg-emerald-500 { background-color: ${accent} !important; }
    .text-emerald-500 { color: ${accent} !important; }
    .border-emerald-500 { border-color: ${accent} !important; }
  `

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
