
"use client"

import { useState, useEffect } from "react";
import { AlertTriangle, TrendingDown, Package, ShieldAlert, ArrowRight, Zap } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { AppNotification } from "@/features/notifications/types";
import { smartAlertService } from "@/features/notifications/services/smartAlertService";

export function CriticalAlertsPanel() {
    const [alerts, setAlerts] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchAlerts = async () => {
            const { data } = await supabase
                .from('app_notifications')
                .select('*')
                .eq('is_read', false)
                .in('priority', ['HIGH', 'CRITICAL'])
                .order('created_at', { ascending: false })
                .limit(3);

            if (data) setAlerts(data);
            setLoading(false);
        };

        fetchAlerts();

        const channel = supabase
            .channel('critical_alerts')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'app_notifications'
            }, () => fetchAlerts())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    if (loading || alerts.length === 0) return null;

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                        <ShieldAlert className="h-4 w-4" />
                    </div>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Alertas de Inteligencia Crítica</h2>
                </div>
                <Badge className="bg-rose-100 text-rose-600 border-none font-black text-[9px] uppercase tracking-widest px-2 py-0.5 animate-pulse">
                    Acción Requerida
                </Badge>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {alerts.map((alert) => (
                    <Card key={alert.id} className={cn(
                        "group border-none shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden relative",
                        alert.priority === 'CRITICAL' ? "bg-slate-900 text-white" : "bg-white"
                    )}>
                        {/* Status bar */}
                        <div className={cn(
                            "absolute top-0 left-0 w-1 h-full",
                            alert.priority === 'CRITICAL' ? "bg-rose-500" : "bg-amber-500"
                        )} />

                        <CardContent className="p-6">
                            <div className="flex flex-col h-full justify-between gap-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className={cn(
                                            "h-9 w-9 rounded-xl flex items-center justify-center shadow-inner group-hover:rotate-6 transition-transform",
                                            alert.priority === 'CRITICAL' ? "bg-white/10 text-rose-400" : "bg-amber-50 text-amber-600"
                                        )}>
                                            {alert.category === 'LIQUIDITY' ? <TrendingDown className="h-5 w-5" /> :
                                                alert.category === 'LOGISTICS' ? <Package className="h-5 w-5" /> :
                                                    <AlertTriangle className="h-5 w-5" />}
                                        </div>
                                        <span className={cn(
                                            "text-[8px] font-black uppercase tracking-[0.2em] italic",
                                            alert.priority === 'CRITICAL' ? "text-rose-400" : "text-amber-500"
                                        )}>
                                            {alert.priority}
                                        </span>
                                    </div>

                                    <div className="space-y-1">
                                        <h3 className={cn(
                                            "text-sm font-black tracking-tight italic uppercase leading-none",
                                            alert.priority === 'CRITICAL' ? "text-white" : "text-slate-900"
                                        )}>{alert.title}</h3>
                                        <p className={cn(
                                            "text-[10px] font-bold leading-relaxed line-clamp-2 italic",
                                            alert.priority === 'CRITICAL' ? "text-slate-400" : "text-slate-400"
                                        )}>{alert.body}</p>
                                    </div>
                                </div>

                                <Button asChild variant="ghost" className={cn(
                                    "w-full h-10 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all justify-between group/btn p-0 pr-4",
                                    alert.priority === 'CRITICAL'
                                        ? "text-white hover:bg-white/5"
                                        : "text-slate-900 hover:bg-slate-50"
                                )}>
                                    <Link href={alert.link || '#'}>
                                        <span className="flex items-center gap-2">
                                            <Zap className={cn("h-3 w-3", alert.priority === 'CRITICAL' ? "text-rose-500" : "text-amber-500")} />
                                            Ejecutar Acción Rectificadora
                                        </span>
                                        <ArrowRight className="h-3 w-3 group-hover/btn:translate-x-1 transition-transform" />
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
