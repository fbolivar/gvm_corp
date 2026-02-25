import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { AlertTriangle, ShieldCheck, Flame, TrendingUp } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface Props {
    riskStats: {
        category: string;
        count: number;
        amount: number;
        color: string;
        preLegalCount?: number;
        preLegalAmount?: number;
    }[]
}

export function DebtorRiskMatrix({ riskStats }: Props) {
    return (
        <Card className="border-none shadow-premium bg-white overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-100 bg-slate-50/30 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xl font-black italic tracking-tighter uppercase flex items-center gap-2">
                        <Flame className="w-5 h-5 text-rose-500" />
                        Matriz de Riesgo AI
                    </CardTitle>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Segmentación inteligente de cartera</p>
                </div>
            </CardHeader>
            <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {riskStats.map((stat) => (
                        <div
                            key={stat.category}
                            className={cn(
                                "group p-6 rounded-[2.5rem] border-2 transition-all hover:scale-105",
                                stat.color === 'rose' ? "bg-rose-50 border-rose-100 text-rose-600" :
                                    stat.color === 'amber' ? "bg-amber-50 border-amber-100 text-amber-600" :
                                        stat.color === 'blue' ? "bg-blue-50 border-blue-100 text-blue-600" :
                                            "bg-emerald-50 border-emerald-100 text-emerald-600"
                            )}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className={cn(
                                    "p-3 rounded-2xl shadow-sm bg-white",
                                    stat.color === 'rose' ? "text-rose-600" :
                                        stat.color === 'amber' ? "text-amber-600" :
                                            stat.color === 'blue' ? "text-blue-600" :
                                                "text-emerald-600"
                                )}>
                                    {stat.category === 'CRITICAL' ? <Flame className="w-6 h-6" /> :
                                        stat.category === 'HIGH' ? <AlertTriangle className="w-6 h-6" /> :
                                            stat.category === 'MEDIUM' ? <TrendingUp className="w-6 h-6" /> :
                                                <ShieldCheck className="w-6 h-6" />}
                                </div>
                                <Badge className={cn(
                                    "px-3 py-1 text-[10px] font-black uppercase tracking-widest border-none",
                                    stat.color === 'rose' ? "bg-rose-600 text-white" :
                                        stat.color === 'amber' ? "bg-amber-600 text-white" :
                                            stat.color === 'blue' ? "bg-blue-600 text-white" :
                                                "bg-emerald-600 text-white"
                                )}>
                                    {stat.count} SUJETOS
                                </Badge>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Impacto Proyectado</p>
                                <p className="text-2xl font-black italic tracking-tighter truncate">
                                    {stat.amount.toLocaleString('es-CO', {
                                        style: 'currency',
                                        currency: 'COP',
                                        maximumFractionDigits: 0
                                    })}
                                </p>
                            </div>

                            {stat.preLegalCount !== undefined && stat.preLegalCount > 0 && (
                                <div className="mt-4 pt-4 border-t border-rose-200/50">
                                    <div className="flex items-center justify-between group-hover:scale-[1.02] transition-transform">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase text-rose-600 tracking-widest flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                Escalamiento Legal
                                            </p>
                                            <p className="text-xs font-black italic text-rose-700">
                                                {stat.preLegalAmount?.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                        <Badge className="bg-rose-100 text-rose-700 border-none font-black text-[9px] px-2 h-5">
                                            {stat.preLegalCount} Casos
                                        </Badge>
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase italic tracking-widest">{stat.category} RISK</span>
                                <div className="h-1 flex-1 bg-white/50 rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "h-full rounded-full transition-all duration-1000",
                                            stat.color === 'rose' ? "bg-rose-500 w-full" :
                                                stat.color === 'amber' ? "bg-amber-500 w-[75%]" :
                                                    stat.color === 'blue' ? "bg-blue-500 w-[50%]" :
                                                        "bg-emerald-500 w-[25%]"
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
