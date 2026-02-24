import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface KPICardProps {
    title: string
    value: string | number
    description?: string
    icon: LucideIcon
    className?: string
    variant?: 'primary' | 'white'
    trend?: {
        value: number
        label: string
        isPositive: boolean
    }
}

export function KPICard({ title, value, description, icon: Icon, className, variant = 'white', trend }: KPICardProps) {
    const isPrimary = variant === 'primary';

    return (
        <Card className={cn(
            "relative overflow-hidden transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] group/kpi border-none shadow-sm",
            isPrimary ? "bg-slate-900 text-white shadow-active" : "bg-white",
            className
        )}>
            {/* Background Decoration */}
            <div className={cn(
                "absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none group-hover/kpi:scale-110 group-hover/kpi:rotate-6 transition-all duration-1000",
                isPrimary ? "text-white" : "text-slate-900"
            )}>
                <Icon className="h-24 w-24" />
            </div>

            <CardContent className="p-6 md:p-8 space-y-6 relative z-10">
                <div className="flex items-start justify-between">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className={cn("h-1.5 w-6 rounded-full", isPrimary ? "bg-primary" : "bg-slate-900")} />
                            <CardTitle className={cn(
                                "text-[10px] font-black uppercase tracking-[0.4em] italic",
                                isPrimary ? "text-slate-400" : "text-slate-400"
                            )}>
                                {title}
                            </CardTitle>
                        </div>
                        <div className={cn(
                            "text-2xl md:text-3xl font-black tracking-tight italic leading-none whitespace-nowrap",
                            isPrimary ? "text-white" : "text-slate-900"
                        )}>
                            {value}
                        </div>
                    </div>
                    <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center transition-all shadow-sm group-hover/kpi:rotate-12 group-hover/kpi:scale-110 duration-500",
                        isPrimary
                            ? "bg-white/10 text-white border border-white/10"
                            : "bg-slate-50 text-slate-900 border border-slate-100"
                    )}>
                        <Icon className="h-6 w-6" />
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-50/10">
                    {trend ? (
                        <div className={cn(
                            "flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm transition-transform group-hover/kpi:translate-x-1",
                            trend.isPositive
                                ? (isPrimary ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border border-emerald-100")
                                : (isPrimary ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-rose-50 text-rose-600 border border-rose-100")
                        )}>
                            {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            <span className="leading-none">{trend.value}%</span>
                        </div>
                    ) : (
                        <p className={cn(
                            "text-[10px] font-black uppercase tracking-widest opacity-60 italic",
                            isPrimary ? "text-slate-500" : "text-slate-400"
                        )}>
                            {description || "Reporte Consolidado"}
                        </p>
                    )}

                    <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] leading-none opacity-40">
                        Protocol Matrix
                    </div>
                </div>

                {/* Progress Bar (Visual Detail) */}
                <div className="h-1.5 w-full bg-slate-100/10 rounded-full overflow-hidden absolute bottom-0 left-0 right-0">
                    <div
                        className={cn(
                            "h-full rounded-none transition-all duration-[2000ms] ease-out",
                            isPrimary ? "bg-primary shadow-[0_0_20px_rgba(59,130,246,0.5)]" : "bg-slate-900"
                        )}
                        style={{ width: trend?.isPositive ? '82%' : '38%' }}
                    />
                </div>
            </CardContent>
        </Card>
    )
}
