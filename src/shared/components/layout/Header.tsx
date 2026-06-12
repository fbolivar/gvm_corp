"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { LogOut, Settings, User as UserIcon } from "lucide-react"
import { NotificationBell } from "./NotificationBell"
import { CommandPaletteTrigger } from "@/features/search/components/CommandPalette"
import { ThemeToggle } from "@/shared/components/theme/ThemeToggle"

export function Header() {
    const [mounted, setMounted] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string>("Miembro");
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const getUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);

                if (user) {
                    const { data: userTenant } = await supabase
                        .from('user_tenants')
                        .select('role')
                        .eq('user_id', user.id)
                        .maybeSingle();

                    if (userTenant) {
                        const roleMap: Record<string, string> = {
                            owner: 'Propietario',
                            admin: 'Administrador',
                            member: 'Miembro',
                            viewer: 'Observador'
                        };
                        const roleName = roleMap[userTenant.role] || userTenant.role;
                        setRole(roleName.charAt(0).toUpperCase() + roleName.slice(1));
                    }
                }

            } catch (error) {
                console.error("Error fetching user:", error);
            } finally {
                setLoading(false);
            }
        };
        getUser();
    }, []);

    if (!mounted || loading || !user) return null;

    const initials = user.user_metadata?.full_name
        ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
        : "US";

    return (
        <div className="flex items-center gap-6">
            <div className="hidden lg:block flex-1 max-w-md">
                <CommandPaletteTrigger />
            </div>

            <div className="flex items-center gap-2 ml-auto">
                <ThemeToggle variant="dropdown" />
                <NotificationBell />
            </div>
        </div>
    );
}
