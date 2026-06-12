"use client"

import dynamic from "next/dynamic"
import { Toaster } from "sonner"
import { PWARegister } from "@/shared/components/PWARegister"

// Dynamic imports to prevent hydration errors from client-only states (Supabase, Zustand)
const Sidebar = dynamic(() => import("@/shared/components/layout/Sidebar").then(mod => mod.Sidebar), { ssr: false })
const MobileNav = dynamic(() => import("@/shared/components/layout/MobileNav").then(mod => mod.MobileNav), { ssr: false })
const Header = dynamic(() => import("@/shared/components/layout/Header").then(mod => mod.Header), { ssr: false })
const CommandPalette = dynamic(() => import("@/features/search/components/CommandPalette").then(mod => mod.CommandPalette), { ssr: false })
const BarcodeScanner = dynamic(() => import("@/shared/components/BarcodeScanner").then(mod => mod.BarcodeScanner), { ssr: false })
const LicenseBanner = dynamic(() => import("@/features/settings/components/LicenseBanner").then(mod => mod.LicenseBanner), { ssr: false })
const AnnouncementsBanner = dynamic(() => import("@/features/super-admin/components/AnnouncementsBanner").then(mod => mod.AnnouncementsBanner), { ssr: false })
const TenantBrandingProvider = dynamic(() => import("@/shared/components/TenantBrandingProvider").then(mod => mod.TenantBrandingProvider), { ssr: false })

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TenantBrandingProvider>
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar />
      <MobileNav />
      <main className="md:pl-72 min-h-screen transition-all relative">
        {/* License expiry banner */}
        <LicenseBanner />
        {/* Top Header (Desktop & Global Actions) */}
        <div className="sticky top-0 z-40 px-8 py-4 bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-md hidden md:block border-b border-slate-200/50 dark:border-slate-800/50">
          <Header />
        </div>

        <div className="p-4 md:p-8">
          {/* Platform-wide announcements (super admin) */}
          <AnnouncementsBanner />
          {children}
        </div>
      </main>

      {/* Global Command Palette */}
      <CommandPalette />

      {/* Global Barcode Scanner */}
      <BarcodeScanner />

      {/* PWA Service Worker Registration */}
      <PWARegister />

      {/* Toast notifications */}
      <Toaster richColors position="top-center" closeButton />

    </div>
    </TenantBrandingProvider>
  )
}
