"use client"

import { SidebarContent } from "./SidebarContent"

export function Sidebar() {
    return (
        <aside className="hidden md:flex w-72 h-screen fixed left-0 top-0 z-50">
            <SidebarContent />
        </aside>
    )
}
