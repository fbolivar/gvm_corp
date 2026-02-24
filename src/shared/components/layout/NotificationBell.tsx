"use client"

import { useState, useEffect } from "react";
import {
    Bell,
    MessageSquare,
    Zap,
    Circle,
    ChevronRight,
    Headset,
    TrendingDown,
    Package
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/shared/lib/utils";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export function NotificationBell() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [hasUnread, setHasUnread] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        const fetchNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: userTenant } = await supabase
                .from('user_tenants')
                .select('tenant_id')
                .eq('user_id', user.id)
                .maybeSingle();

            const { data } = await supabase
                .from('app_notifications')
                .select('*')
                .or(`user_id.eq.${user.id},and(user_id.is.null,tenant_id.eq.${userTenant?.tenant_id})`)
                .order('created_at', { ascending: false })
                .limit(10);

            if (data) {
                setNotifications(data);
                setHasUnread(data.some(n => !n.is_read));
                setUserId(user.id);
                setTenantId(userTenant?.tenant_id || null);
            }
        };

        fetchNotifications();

        // Realtime subscription
        const channel = supabase
            .channel('app_notifications')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'app_notifications'
            }, (payload: any) => {
                const n = payload.new;

                // Disparar Toast para alertas críticas/altas
                if (n.priority === 'CRITICAL' || n.priority === 'HIGH') {
                    toast.error(n.title, {
                        description: n.body,
                        duration: 8000,
                        action: n.link ? {
                            label: 'Ver Alerta',
                            onClick: () => window.location.href = n.link
                        } : undefined
                    });
                }

                setNotifications(prev => {
                    setHasUnread(true);
                    return [n, ...prev].slice(0, 10);
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const markAsRead = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
            .from('app_notifications')
            .update({ is_read: true })
            .eq('user_id', user.id);

        setHasUnread(false);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    return (
        <DropdownMenu onOpenChange={(open) => open && markAsRead()}>
            <DropdownMenuTrigger asChild>
                <div className="relative group cursor-pointer hover:scale-110 transition-transform p-3 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-100">
                    <Bell className={cn(
                        "h-5 w-5 transition-colors",
                        hasUnread ? "text-indigo-600 animate-pulse" : "text-slate-400 group-hover:text-slate-900"
                    )} />
                    {hasUnread && (
                        <Circle className="absolute top-3 right-3 h-2 w-2 fill-rose-500 text-rose-500 border-2 border-white" />
                    )}
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-[2rem] p-4 shadow-premium border-slate-50 bg-white/95 backdrop-blur-xl">
                <DropdownMenuLabel className="flex items-center justify-between p-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Notificaciones</span>
                    <Badge className="bg-indigo-50 text-indigo-600 border-none px-2 h-5 text-[8px] font-black uppercase tracking-widest">{notifications.length}</Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-50 my-2" />
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-2 p-1">
                    {notifications.map((n) => (
                        <DropdownMenuItem key={n.id} asChild className="p-0 border-none focus:bg-transparent">
                            <Link href={n.link || '#'} className={cn(
                                "flex gap-4 p-4 rounded-2xl transition-all border border-transparent",
                                n.is_read ? "opacity-60 grayscale-[0.5]" :
                                    n.priority === 'CRITICAL' ? "bg-rose-50 border-rose-100 italic" :
                                        n.priority === 'HIGH' ? "bg-amber-50 border-amber-100" :
                                            "bg-indigo-50/30 border-indigo-100/50 hover:bg-indigo-50"
                            )}>
                                <div className={cn(
                                    "h-10 w-10 rounded-xl shadow-sm flex items-center justify-center shrink-0 border transition-colors",
                                    n.priority === 'CRITICAL' ? "bg-rose-500 text-white border-rose-400" :
                                        n.priority === 'HIGH' ? "bg-amber-500 text-white border-amber-400" :
                                            "bg-white text-indigo-500 border-slate-50"
                                )}>
                                    {n.category === 'LIQUIDITY' ? <TrendingDown className="h-5 w-5" /> :
                                        n.category === 'LOGISTICS' ? <Package className="h-5 w-5" /> :
                                            <MessageSquare className="h-5 w-5" />}
                                </div>
                                <div className="space-y-1 min-w-0">
                                    <p className="text-xs font-black text-slate-900 leading-tight italic line-clamp-1">{n.title}</p>
                                    <p className="text-[10px] font-bold text-slate-400 line-clamp-2 leading-relaxed italic">{n.body}</p>
                                    <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest pt-1 flex items-center gap-1">
                                        <Zap className="h-2 w-2" /> {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                                    </p>
                                </div>
                                <ChevronRight className="ml-auto h-4 w-4 text-slate-200 shrink-0 self-center" />
                            </Link>
                        </DropdownMenuItem>
                    ))}
                    {notifications.length === 0 && (
                        <div className="py-8 text-center space-y-3">
                            <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto">
                                <Bell className="h-6 w-6 text-slate-200" />
                            </div>
                            <p className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest">Sin notificaciones</p>
                        </div>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function Badge({ children, className }: any) {
    return (
        <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>
            {children}
        </span>
    );
}
