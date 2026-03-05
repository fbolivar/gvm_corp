'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingDown, Package, ShieldAlert, ArrowRight, Zap } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { AppNotification } from '@/features/notifications/types';

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
                table: 'app_notifications',
            }, () => fetchAlerts())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading || alerts.length === 0) return null;

    return (
        <div className="space-y-3 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-rose-500 flex items-center justify-center text-white">
                        <ShieldAlert className="h-3.5 w-3.5" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-900">Alertas Críticas</h2>
                </div>
                <Badge className="bg-rose-100 text-rose-600 border-none font-semibold text-[9px] px-2 py-0.5 animate-pulse">
                    Acción Requerida
                </Badge>
            </div>

            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {alerts.map((alert) => (
                    <Card key={alert.id} className={cn(
                        'rounded-2xl shadow-sm overflow-hidden relative',
                        alert.priority === 'CRITICAL' ? 'bg-slate-900 text-white border-slate-800' : 'bg-white border border-slate-100',
                    )}>
                        {/* Status bar */}
                        <div className={cn(
                            'absolute top-0 left-0 w-1 h-full',
                            alert.priority === 'CRITICAL' ? 'bg-rose-500' : 'bg-amber-500',
                        )} />

                        <CardContent className="p-5">
                            <div className="flex flex-col h-full justify-between gap-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className={cn(
                                            'h-9 w-9 rounded-xl flex items-center justify-center',
                                            alert.priority === 'CRITICAL' ? 'bg-white/10 text-rose-400' : 'bg-amber-50 text-amber-600',
                                        )}>
                                            {alert.category === 'LIQUIDITY' ? <TrendingDown className="h-4 w-4" /> :
                                                alert.category === 'LOGISTICS' ? <Package className="h-4 w-4" /> :
                                                    <AlertTriangle className="h-4 w-4" />}
                                        </div>
                                        <Badge className={cn(
                                            'text-[9px] font-semibold border-none',
                                            alert.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-100 text-amber-600',
                                        )}>
                                            {alert.priority}
                                        </Badge>
                                    </div>

                                    <div>
                                        <h3 className={cn(
                                            'text-sm font-bold',
                                            alert.priority === 'CRITICAL' ? 'text-white' : 'text-slate-900',
                                        )}>{alert.title}</h3>
                                        <p className={cn(
                                            'text-[10px] leading-relaxed line-clamp-2 mt-1',
                                            alert.priority === 'CRITICAL' ? 'text-slate-400' : 'text-slate-400',
                                        )}>{alert.body}</p>
                                    </div>
                                </div>

                                <Button asChild variant="ghost" className={cn(
                                    'w-full h-8 rounded-lg font-semibold text-[10px] justify-between px-3',
                                    alert.priority === 'CRITICAL'
                                        ? 'text-white hover:bg-white/5'
                                        : 'text-slate-900 hover:bg-slate-50',
                                )}>
                                    <Link href={alert.link || '#'}>
                                        <span className="flex items-center gap-1.5">
                                            <Zap className={cn('h-3 w-3', alert.priority === 'CRITICAL' ? 'text-rose-500' : 'text-amber-500')} />
                                            Tomar Acción
                                        </span>
                                        <ArrowRight className="h-3 w-3" />
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
