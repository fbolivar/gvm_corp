"use client"

import { useState, useEffect } from "react"
import { Menu, X, Search } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { SidebarContent } from "./SidebarContent"
import { usePathname } from "next/navigation"

export function MobileNav() {
    const [isOpen, setIsOpen] = useState(false)
    const pathname = usePathname()

    // Close on route change
    useEffect(() => {
        setIsOpen(false)
    }, [pathname])

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

    return (
        <>
            {/* Top Bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
                <div className="flex items-center gap-2">
                    <img src="/logo-gvm.png" alt="GVM S.A.S" className="h-7 w-7 object-contain" />
                    <span className="text-base font-black text-slate-900 tracking-tight italic">
                        GVM<span className="text-primary"> S.A.S</span>
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
                        className="text-slate-600 hover:bg-slate-100 rounded-lg h-9 w-9"
                    >
                        <Search className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsOpen(!isOpen)}
                        className="text-slate-600 hover:bg-slate-100 rounded-lg h-9 w-9"
                    >
                        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Overlay */}
            <div
                className={`md:hidden fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsOpen(false)}
            />

            {/* Drawer */}
            <div className={`md:hidden fixed top-0 bottom-0 left-0 w-72 z-[70] transform transition-transform duration-300 ease-out shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <SidebarContent onNavigate={() => setIsOpen(false)} />
            </div>
        </>
    )
}
