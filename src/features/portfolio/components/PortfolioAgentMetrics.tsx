import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { TrendingUp, Mail, DollarSign, Activity, Clock } from "lucide-react"

interface Props {
    metrics: {
        totalActions: number;
        totalManagedAmount: number;
        totalRecoveredAmount: number;
        actionBreakdown: Record<string, number>;
        recoveryRate: number;
        avgPaymentDays?: number;
    }
}

export function PortfolioAgentMetrics({ metrics }: Props) {
    const cards = [
        {
            title: "Gestión Activa",
            value: metrics.totalActions.toString(),
            icon: Activity,
            color: "text-blue-500",
            bg: "bg-blue-50"
        },
        {
            title: "Velocidad de Pago",
            value: `${metrics.avgPaymentDays || 0} Días`,
            icon: Clock,
            color: "text-amber-500",
            bg: "bg-amber-50"
        },
        {
            title: "Recaudo Atribuido",
            value: metrics.totalRecoveredAmount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }),
            icon: DollarSign,
            color: "text-emerald-500",
            bg: "bg-emerald-50"
        },
        {
            title: "Tasa de Recuperación",
            value: `${metrics.recoveryRate}%`,
            icon: TrendingUp,
            color: "text-indigo-500",
            bg: "bg-indigo-50"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card, i) => (
                <Card key={i} className="border-none shadow-premium hover:scale-105 transition-all duration-300 overflow-hidden">
                    <CardHeader className="p-6 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                            {card.title}
                        </CardTitle>
                        <div className={`p-3 rounded-2xl ${card.bg} ${card.color}`}>
                            <card.icon className="w-5 h-5" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <div className="text-2xl font-black italic tracking-tighter text-slate-900">
                            {card.value}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
