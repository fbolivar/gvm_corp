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

export function Header() {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string>("Miembro");
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

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

    if (loading) return null;
    if (!user) return null;

    const initials = user.user_metadata?.full_name
        ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
        : "US";

    return (
        <div className="flex items-center gap-6">
            <div className="hidden lg:block flex-1 max-w-md">
                <CommandPaletteTrigger />
            </div>

            <div className="flex items-center gap-2 ml-auto">
                <NotificationBell />
                <div className="inline-flex">
                    {user && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <div className="flex items-center gap-3 bg-white pl-4 pr-1 py-1 rounded-full shadow-lg shadow-slate-200/60 border border-slate-100 cursor-pointer hover:bg-slate-50 hover:shadow-xl transition-all group">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-xs font-bold text-slate-900 leading-none group-hover:text-primary transition-colors">
                                            {user.user_metadata?.full_name || "Usuario"}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
                                            {role}
                                        </p>
                                    </div>

                                    <Avatar className="h-9 w-9 border-2 border-slate-100 group-hover:border-primary/20 transition-colors">
                                        <AvatarImage src={user.user_metadata?.avatar_url} />
                                        <AvatarFallback className="bg-slate-900 text-white font-bold text-[10px] group-hover:bg-primary transition-colors">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user.user_metadata?.full_name}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {user.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuItem onClick={() => window.location.href = "/settings/profile"}>
                                        <UserIcon className="mr-2 h-4 w-4" />
                                        <span>Perfil</span>
                                        <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => window.location.href = "/settings"}>
                                        <Settings className="mr-2 h-4 w-4" />
                                        <span>Ajustes</span>
                                        <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={async () => {
                                    await supabase.auth.signOut();
                                    window.location.href = "/login";
                                }} className="text-rose-600 focus:text-rose-600 focus:bg-rose-50">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Cerrar Sesión</span>
                                    <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>
        </div>
    );
}
