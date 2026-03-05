import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface KPICardProps {
    title: string;
    value: string | number;
    description?: string;
    icon: LucideIcon;
    className?: string;
    variant?: 'primary' | 'white';
    trend?: {
        value: number;
        label: string;
        isPositive: boolean;
    };
}

export function KPICard({ title, value, description, icon: Icon, className, variant = 'white', trend }: KPICardProps) {
    const isPrimary = variant === 'primary';

    return (
        <Card className={cn(
            'rounded-2xl shadow-sm overflow-hidden',
            isPrimary ? 'bg-slate-900 text-white border-slate-800' : 'bg-white border border-slate-100',
            className,
        )}>
            <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                    <div className={cn(
                        'h-10 w-10 rounded-xl flex items-center justify-center',
                        isPrimary ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-900 border border-slate-100',
                    )}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <p className={cn(
                        'text-[10px] font-semibold uppercase tracking-wider',
                        isPrimary ? 'text-slate-400' : 'text-slate-400',
                    )}>
                        {title}
                    </p>
                </div>

                <div className={cn(
                    'text-xl font-bold tabular-nums',
                    isPrimary ? 'text-white' : 'text-slate-900',
                )}>
                    {value}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-50/10">
                    {trend ? (
                        <Badge className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full border-none flex items-center gap-1',
                            trend.isPositive
                                ? (isPrimary ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                                : (isPrimary ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'),
                        )}>
                            {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {trend.value}%
                        </Badge>
                    ) : (
                        <p className={cn(
                            'text-[10px] font-semibold uppercase tracking-wider',
                            isPrimary ? 'text-slate-500' : 'text-slate-400',
                        )}>
                            {description || 'Reporte Consolidado'}
                        </p>
                    )}

                    {trend && (
                        <span className={cn(
                            'text-[10px] font-semibold',
                            isPrimary ? 'text-slate-500' : 'text-slate-400',
                        )}>
                            {trend.label}
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
