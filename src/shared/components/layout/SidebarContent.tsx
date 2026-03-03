"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/shared/lib/utils"
import {
    LayoutDashboard,
    Users,
    ShoppingCart,
    Package,
    Factory,
    Calculator,
    FileText,
    Receipt,
    LogOut,
    Settings,
    HelpCircle,
    User as UserIcon,
    ChevronUp,
    ChevronDown,
    ClipboardList,
    FileBarChart,
    BookOpen,
    Scale,
    BarChart3,
    Package2,
    Warehouse,
    History,
    DollarSign,
    Banknote,
    MessageSquare,
    Truck,
    Target,
    UserPlus,
    Heart,
    ShoppingBag,
    Headset,
    Plus,
    ShieldCheck,
    Wallet,
    TrendingDown,
    Sparkles,
    CreditCard,
    Upload,
    Bell,
    TrendingUp,
    BarChart2,
    Clock,
    Landmark
} from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { useI18n } from "@/shared/stores/useLanguageStore"
import { getUnreadCountAction } from "@/features/notifications/actions"

interface SubLink {
    title: string
    href: string
    icon: React.ComponentType<{ className?: string }>
}

interface SidebarLink {
    title: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    moduleKey?: string
    children?: SubLink[]
}

interface SidebarGroup {
    group: string
    links: SidebarLink[]
}

interface SidebarContentProps {
    onNavigate?: () => void
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
    const { t } = useI18n();
    const pathname = usePathname();

    const sidebarLinks: SidebarGroup[] = [
        {
            group: t.sidebar.dashboard.toUpperCase(),
            links: [
                { title: t.sidebar.dashboard, href: "/dashboard", icon: LayoutDashboard, moduleKey: 'dashboard' },
                {
                    title: t.sidebar.analytics,
                    href: "/analytics",
                    icon: BarChart3,
                    moduleKey: 'analytics',
                    children: [
                        { title: 'Ventas BI', href: '/analytics/sales', icon: TrendingUp },
                        { title: 'Financiero BI', href: '/analytics/financial', icon: BarChart2 },
                    ]
                },
                {
                    title: t.sidebar.sales,
                    href: "/sales",
                    icon: ShoppingCart,
                    moduleKey: 'sales',
                    children: [
                        { title: t.sidebar.quotations, href: "/sales/quotations", icon: ClipboardList },
                        { title: t.sidebar.orders, href: "/sales/orders", icon: FileBarChart },
                    ]
                },
                {
                    title: t.sidebar.inventory,
                    href: "/inventory",
                    icon: Package,
                    moduleKey: 'inventory',
                    children: [
                        { title: t.sidebar.movements, href: "/inventory/new", icon: History },
                        { title: t.sidebar.warehouses, href: "/inventory/warehouses", icon: Warehouse },
                        { title: t.sidebar.valuation, href: "/accounting/reports/inventory-valuation", icon: Package2 },
                    ]
                },
                {
                    title: t.sidebar.crm,
                    href: "/crm",
                    icon: Heart,
                    moduleKey: 'crm',
                    children: [
                        { title: t.sidebar.leads, href: "/crm/leads", icon: UserPlus },
                        { title: t.sidebar.pipeline, href: "/crm/pipeline", icon: Target },
                    ]
                },
                {
                    title: t.sidebar.support,
                    href: "/support",
                    icon: Headset,
                    moduleKey: 'crm', // Map to CRM for now
                    children: [
                        { title: t.sidebar.tickets, href: "/support/tickets", icon: ClipboardList },
                        { title: t.sidebar.new_ticket, href: "/support/tickets/new", icon: Plus },
                    ]
                },
                { title: t.sidebar.parties, href: "/parties", icon: Users, moduleKey: 'crm' },
                { title: 'Portal Cliente', href: "/client-portal", icon: UserPlus, moduleKey: 'crm' },
                { title: t.sidebar.my_payroll, href: "/my-payroll", icon: Banknote }, // siempre visible
            ]
        },
        {
            group: t.sidebar.operations.toUpperCase(),
            links: [
                {
                    title: t.sidebar.purchasing,
                    href: "/purchasing",
                    icon: ShoppingBag,
                    moduleKey: 'purchasing',
                    children: [
                        { title: t.sidebar.orders, href: "/purchasing/orders", icon: FileBarChart },
                        { title: t.sidebar.bills, href: "/purchasing/bills", icon: Receipt },
                    ]
                },
                { title: t.sidebar.reports, href: "/documents", icon: Receipt, moduleKey: 'documents' },
                { title: t.sidebar.production, href: "/production", icon: Factory, moduleKey: 'production' },
                {
                    title: t.sidebar.payroll,
                    href: "/payroll",
                    icon: Calculator,
                    moduleKey: 'payroll',
                    children: [
                        { title: t.payroll.settlement, href: "/payroll/settlement", icon: Calculator },
                        { title: t.payroll.social_security, href: "/payroll/social-security", icon: ShieldCheck },
                        { title: 'Control de Asistencia', href: "/payroll/attendance", icon: ClipboardList },
                        { title: t.payroll.finance_portal, href: "/payroll/finance", icon: Wallet },
                        { title: t.payroll.simulator, href: "/payroll/simulator", icon: Sparkles },
                        { title: t.payroll.terminations, href: "/payroll/settlement/termination", icon: TrendingDown },
                        { title: 'Horas Extra', href: "/payroll/overtime", icon: Clock },
                    ]
                },
                {
                    title: t.sidebar.accounting,
                    href: "/accounting/reports",
                    icon: FileText,
                    moduleKey: 'accounting',
                    children: [
                        { title: t.accounting.p_and_l, href: "/accounting/reports/p-and-l", icon: BarChart3 },
                        { title: t.accounting.trial_balance, href: "/accounting/reports/trial-balance", icon: Scale },
                        { title: t.accounting.balance_sheet, href: "/accounting/reports/balance-sheet", icon: DollarSign },
                        { title: t.accounting.auxiliary, href: "/accounting/reports/auxiliary", icon: BookOpen },
                        { title: t.accounting.portfolio, href: "/accounting/cartera", icon: CreditCard },
                        { title: t.accounting.entries, href: "/accounting/entries", icon: Banknote },
                        { title: 'Presupuesto', href: "/budget", icon: Target },
                    ]
                },
                { title: t.sidebar.logistics, href: "/logistics", icon: Truck, moduleKey: 'logistics' },
                { title: 'Tesorería', href: "/treasury", icon: Landmark, moduleKey: 'accounting' },
                { title: 'Contratos', href: "/contracts", icon: FileText, moduleKey: 'documents' },
                { title: 'Portal Proveedores', href: "/vendor-portal", icon: Users, moduleKey: 'purchasing' },
            ]
        },
        {
            group: t.sidebar.tools.toUpperCase(),
            links: [
                { title: 'Notificaciones', href: "/notifications", icon: Bell }, // siempre visible
                { title: 'GVM AI', href: "/ai-assistant", icon: Sparkles }, // siempre visible
                { title: t.sidebar.collaboration, href: "/collaboration", icon: MessageSquare }, // siempre visible
                { title: 'Importación', href: "/settings/import", icon: Upload }, // siempre visible
                { title: t.sidebar.settings, href: "/settings", icon: Settings, moduleKey: 'settings' },
                { title: t.sidebar.help, href: "/help", icon: HelpCircle }, // siempre visible
            ]
        }
    ];

    const [mounted, setMounted] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string>("Miembro");
    const [permissions, setPermissions] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
    const [unreadCount, setUnreadCount] = useState(0);
    const supabase = createClient();

    useEffect(() => {
        setMounted(true);
        getUnreadCountAction().then(setUnreadCount).catch(() => {});
    }, []);

    // Auto-expand the section that matches current path
    useEffect(() => {
        const initial: Record<string, boolean> = {};
        sidebarLinks.forEach(group => {
            group.links.forEach(link => {
                if (link.children) {
                    const isChildActive = link.children.some(child => pathname.startsWith(child.href));
                    const isParentActive = pathname === link.href || pathname.startsWith(link.href);
                    if (isChildActive || isParentActive) {
                        initial[link.href] = true;
                    }
                }
            });
        });
        setOpenSections(prev => ({ ...prev, ...initial }));
    }, [pathname]);

    useEffect(() => {
        const getUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);

                if (user) {
                    // Traer role, role_id Y tenant_id del usuario
                    const { data: userTenant } = await supabase
                        .from('user_tenants')
                        .select('role, role_id, tenant_id')
                        .eq('user_id', user.id)
                        .maybeSingle();

                    if (userTenant) {
                        const roleName = userTenant.role || 'Miembro';
                        setRole(roleName);

                        // Roles top-level: comparación EXACTA
                        const HIGH_LEVEL_ROLES = ['SUPER ADMINISTRADOR', 'ADMINISTRADOR', 'owner', 'admin'];
                        const isHighLevel = HIGH_LEVEL_ROLES.includes(roleName);

                        if (isHighLevel) {
                            setPermissions({ all: true });
                        } else if (userTenant.role_id) {
                            // Consultar permisos por role_id (sin tenant_id, esa col no existe)
                            const { data: perms, error: permsError } = await supabase
                                .from('role_permissions')
                                .select('module_key, can_view')
                                .eq('role_id', userTenant.role_id);

                            if (permsError) {
                                console.error('Error cargando permisos:', permsError.message);
                                setPermissions({});
                            } else if (perms && perms.length > 0) {
                                const permMap: Record<string, boolean> = {};
                                perms.forEach((p: { module_key: string; can_view: boolean }) => {
                                    if (p.can_view) permMap[p.module_key] = true;
                                });
                                setPermissions(permMap);
                            } else {
                                // Sin permisos → nada visible (excepto dashboard por defecto)
                                setPermissions({ dashboard: true });
                            }
                        } else {
                            // Sin role_id → solo dashboard
                            setPermissions({ dashboard: true });
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching user or permissions:", error);
                setPermissions({});
            } finally {
                setLoading(false);
            }
        };
        getUser();
    }, []);

    // Verificar si el usuario puede ver un módulo
    const isAuthorized = (moduleKey?: string) => {
        // Links sin moduleKey asignado: siempre visibles (dashboard, help...)
        if (!moduleKey) return true;
        // Solo administradores reales ven todo sin restricción (Doble candado de seguridad local)
        const isStrictAdmin = ['SUPER ADMINISTRADOR', 'ADMINISTRADOR', 'owner', 'admin'].includes(role);
        if (permissions.all && isStrictAdmin) return true;

        // Solo lo que está explícitamente en el permMap para roles operativos
        return permissions[moduleKey] === true;
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
    };

    const toggleSection = (href: string) => {
        setOpenSections(prev => ({ ...prev, [href]: !prev[href] }));
    };

    if (!mounted) return null;

    return (
        <div className="flex flex-col h-full bg-white border-r border-slate-100 shadow-sm overflow-hidden relative group/sidebar">
            {/* 🏎️ Brand Logo Section */}
            <div className="h-24 flex items-center px-8 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-[0.03] pointer-events-none group-hover/sidebar:rotate-12 transition-transform duration-1000">
                    <Factory className="h-16 w-16 text-slate-900" />
                </div>
                <div className="flex items-center gap-3 relative z-10">
                    <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center p-1.5 border border-slate-100 shadow-inner group-hover/sidebar:scale-110 transition-transform duration-500">
                        <img src="/logo-gvm.png" alt="GVM S.A.S" className="h-full w-full object-contain" />
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="text-xl font-black text-slate-900 tracking-tighter italic">
                            GVM<span className="text-indigo-600 italic"> S.A.S</span>
                        </span>
                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 italic">Enterprise OS v3.0</span>
                    </div>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto pt-2 px-6 space-y-8 custom-scrollbar relative z-10">
                {sidebarLinks.map((group, groupIndex) => {
                    const visibleLinks = group.links.filter(link => isAuthorized(link.moduleKey));
                    if (visibleLinks.length === 0) return null;

                    return (
                        <div key={groupIndex} className="space-y-3">
                            <div className="flex items-center gap-2 px-3">
                                <div className="h-px flex-1 bg-slate-100" />
                                <h3 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.25em] whitespace-nowrap">
                                    {group.group}
                                </h3>
                                <div className="h-px w-3 bg-slate-100" />
                            </div>
                            <div className="space-y-1">
                                {visibleLinks.map((link) => {
                                    const hasChildren = link.children && link.children.length > 0;
                                    const isOpen = openSections[link.href] || false;
                                    const isActive = pathname === link.href || (pathname.startsWith(link.href) && !hasChildren);
                                    const isChildActive = hasChildren && link.children!.some(child => pathname.startsWith(child.href));

                                    return (
                                        <div key={link.href} className="space-y-0.5">
                                            {/* Parent Link */}
                                            {hasChildren ? (
                                                <button
                                                    onClick={() => toggleSection(link.href)}
                                                    className={cn(
                                                        "w-full flex items-center justify-between px-3 py-3 text-[12px] font-black rounded-xl transition-all duration-300 group/link border border-transparent",
                                                        isChildActive || isOpen
                                                            ? "text-slate-900 bg-slate-50 border-slate-100 shadow-sm"
                                                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "h-7 w-7 rounded-lg flex items-center justify-center transition-all shadow-sm",
                                                            isChildActive || isOpen ? "bg-indigo-600 text-white shadow-indigo-100" : "bg-white text-slate-400 border border-slate-100 group-hover/link:bg-slate-100 group-hover/link:text-slate-600"
                                                        )}>
                                                            <link.icon className="h-3.5 w-3.5" />
                                                        </div>
                                                        <span className="uppercase tracking-widest italic">{link.title}</span>
                                                    </div>
                                                    <ChevronDown className={cn(
                                                        "h-3.5 w-3.5 text-slate-300 transition-transform duration-300",
                                                        isOpen && "rotate-180 text-indigo-600"
                                                    )} />
                                                </button>
                                            ) : (
                                                <Link
                                                    href={link.href}
                                                    onClick={onNavigate}
                                                    className={cn(
                                                        "flex items-center gap-3 px-3 py-3 text-[12px] font-black rounded-xl transition-all duration-300 group/link border border-transparent",
                                                        isActive
                                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                                                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "h-7 w-7 rounded-lg flex items-center justify-center transition-all relative",
                                                        isActive ? "bg-white/20 text-white" : "bg-slate-50 text-slate-400 group-hover/link:bg-slate-100 group-hover/link:text-slate-600"
                                                    )}>
                                                        <link.icon className="h-3.5 w-3.5" />
                                                        {link.href === '/notifications' && unreadCount > 0 && (
                                                            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center leading-none">
                                                                {unreadCount > 99 ? '99+' : unreadCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="uppercase tracking-widest italic">{link.title}</span>
                                                </Link>
                                            )}

                                            {/* Children (Accordion) */}
                                            {hasChildren && (
                                                <div className={cn(
                                                    "overflow-hidden transition-all duration-500 ease-in-out px-2",
                                                    isOpen ? "max-h-[800px] opacity-100 py-1" : "max-h-0 opacity-0"
                                                )}>
                                                    <div className="ml-3.5 pl-3.5 border-l border-slate-100 space-y-0.5">
                                                        {/* Overview link */}
                                                        <Link
                                                            href={link.href}
                                                            onClick={onNavigate}
                                                            className={cn(
                                                                "flex items-center gap-2.5 px-3 py-2 text-[9px] font-black uppercase tracking-[0.15em] rounded-lg transition-all duration-300 italic",
                                                                pathname === link.href
                                                                    ? "text-indigo-600 bg-indigo-50"
                                                                    : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                                                            )}
                                                        >
                                                            <div className="h-1 w-1 rounded-full bg-current opacity-30" />
                                                            <span>Vista General</span>
                                                        </Link>
                                                        {link.children!.map((child) => {
                                                            const isSubActive = pathname.startsWith(child.href);
                                                            return (
                                                                <Link
                                                                    key={child.href}
                                                                    href={child.href}
                                                                    onClick={onNavigate}
                                                                    className={cn(
                                                                        "flex items-center gap-2.5 px-3 py-2 text-[9px] font-black uppercase tracking-[0.15em] rounded-lg transition-all duration-300 italic",
                                                                        isSubActive
                                                                            ? "text-indigo-600 bg-indigo-50"
                                                                            : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                                                                    )}
                                                                >
                                                                    <child.icon className={cn(
                                                                        "h-3 w-3",
                                                                        isSubActive ? "text-indigo-600" : "opacity-30"
                                                                    )} />
                                                                    <span>{child.title}</span>
                                                                </Link>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* User Profile Section */}
            <div className="mt-auto shrink-0 p-6">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="w-full flex items-center gap-3 px-1.5 py-1.5 rounded-xl hover:bg-white transition-all group cursor-pointer text-left">
                                    <div className="relative">
                                        <Avatar className="h-10 w-10 border-2 border-slate-200 group-hover:border-indigo-600 transition-colors shrink-0 rounded-xl overflow-hidden shadow-sm">
                                            <AvatarImage src={user.user_metadata?.avatar_url} />
                                            <AvatarFallback className="bg-slate-900 text-white font-black text-[10px] group-hover:bg-indigo-600 transition-colors uppercase">
                                                {user.user_metadata?.full_name
                                                    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)
                                                    : 'US'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 border-2 border-white rounded-full shadow-lg" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] font-black text-slate-900 leading-none truncate italic group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                                            {user.user_metadata?.full_name?.split(' ')[0] || 'Usuario'}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <div className="h-1 w-1 bg-indigo-600 rounded-full" />
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em]">
                                                {role}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronUp className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-900 transition-colors shrink-0" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-60 mb-3 bg-white border-slate-100 text-slate-900 rounded-2xl p-2 shadow-2xl" side="top" align="start" forceMount>
                                <DropdownMenuLabel className="font-normal p-3">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-xs font-black italic uppercase tracking-tight">{user.user_metadata?.full_name}</p>
                                        <p className="text-[9px] font-medium text-slate-400 truncate">{user.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-slate-100" />
                                <DropdownMenuGroup className="p-1.5 space-y-0.5">
                                    <DropdownMenuItem onClick={() => window.location.href = '/settings/profile'} className="rounded-xl focus:bg-slate-50 focus:text-indigo-600 cursor-pointer py-2.5">
                                        <UserIcon className="mr-2.5 h-3.5 w-3.5 text-indigo-600" />
                                        <span className="text-[10px] font-black uppercase tracking-widest italic">Perfil Maestro</span>
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator className="bg-slate-100" />
                                <DropdownMenuItem onClick={handleSignOut} className="rounded-xl focus:bg-rose-50 focus:text-rose-600 cursor-pointer py-2.5 text-rose-500">
                                    <LogOut className="mr-2.5 h-3.5 w-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest italic">Cerrar Sesión</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Button
                            variant="ghost"
                            onClick={handleSignOut}
                            className="w-full justify-start text-slate-400 font-black hover:text-slate-900 hover:bg-white transition-all rounded-xl h-11 uppercase tracking-widest text-[9px] italic"
                        >
                            <LogOut className="mr-3 h-4 w-4" />
                            Cerrar Sesión
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
