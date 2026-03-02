"use client"

import dynamic from "next/dynamic"

// Dynamic imports to prevent hydration errors from client-only states (Supabase, Zustand)
const Sidebar = dynamic(() => import("@/shared/components/layout/Sidebar").then(mod => mod.Sidebar), { ssr: false })
const MobileNav = dynamic(() => import("@/shared/components/layout/MobileNav").then(mod => mod.MobileNav), { ssr: false })
const Header = dynamic(() => import("@/shared/components/layout/Header").then(mod => mod.Header), { ssr: false })
const CommandPalette = dynamic(() => import("@/features/search/components/CommandPalette").then(mod => mod.CommandPalette), { ssr: false })
const AIAssistantChat = dynamic(() => import("@/features/ai/components/AIAssistantChat").then(mod => mod.AIAssistantChat), { ssr: false })

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#F3F4F6]">
      <Sidebar />
      <MobileNav />
      <main className="md:pl-72 min-h-screen transition-all relative">
        {/* Top Header (Desktop & Global Actions) */}
        <div className="sticky top-0 z-40 px-8 py-4 bg-[#F3F4F6]/80 backdrop-blur-md hidden md:block">
          <Header />
        </div>

        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Global Command Palette */}
      <CommandPalette />

      {/* AI Floating Assistant */}
      <AIAssistantChat mode="floating" />
    </div>
  )
}
