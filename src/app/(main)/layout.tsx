import { Sidebar } from "@/shared/components/layout/Sidebar"
import { MobileNav } from "@/shared/components/layout/MobileNav"
import { Header } from "@/shared/components/layout/Header"
import { CommandPalette } from "@/features/search/components/CommandPalette"

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
    </div>
  )
}
