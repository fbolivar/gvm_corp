"use client"

import { useState } from "react"
import { OpportunityStage } from "../types"
import { OpportunityCard } from "./OpportunityCard"
import { updateOpportunityStageAction } from "../actions"
import { toast } from "sonner"
import { cn } from "@/shared/lib/utils"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
    Target,
    Zap,
    FileText,
    MessageSquare,
    Trophy,
    XCircle,
    TrendingUp,
    Sparkles,
    LayoutDashboard,
    ArrowRight
} from "lucide-react"

interface Props {
    initialOpportunities: any[]
}

const STAGES: OpportunityStage[] = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];

const STAGE_LABELS: Record<OpportunityStage, string> = {
    'PROSPECTING': 'Prospección',
    'QUALIFICATION': 'Calificación',
    'PROPOSAL': 'Propuesta',
    'NEGOTIATION': 'Negociación',
    'CLOSED_WON': 'Ganada 🚀',
    'CLOSED_LOST': 'Perdida ❌'
};

const STAGE_HEADER_COLORS: Record<OpportunityStage, string> = {
    'PROSPECTING': 'bg-blue-500 shadow-blue-500/20',
    'QUALIFICATION': 'bg-indigo-500 shadow-indigo-500/20',
    'PROPOSAL': 'bg-violet-500 shadow-violet-500/20',
    'NEGOTIATION': 'bg-amber-500 shadow-amber-500/20',
    'CLOSED_WON': 'bg-emerald-500 shadow-emerald-500/20',
    'CLOSED_LOST': 'bg-rose-500 shadow-rose-500/20'
};

const STAGE_ICONS: Record<OpportunityStage, any> = {
    'PROSPECTING': Target,
    'QUALIFICATION': Zap,
    'PROPOSAL': FileText,
    'NEGOTIATION': MessageSquare,
    'CLOSED_WON': Trophy,
    'CLOSED_LOST': XCircle
};

export function OpportunityKanban({ initialOpportunities }: Props) {
    const [opportunities, setOpportunities] = useState(initialOpportunities);

    const handleMove = async (id: string, direction: 'NEXT' | 'PREV') => {
        const opportunity = opportunities.find(o => o.id === id);
        if (!opportunity) return;

        const currentIndex = STAGES.indexOf(opportunity.stage);
        const newIndex = direction === 'NEXT' ? currentIndex + 1 : currentIndex - 1;

        if (newIndex < 0 || newIndex >= STAGES.length) return;

        const newStage = STAGES[newIndex];

        // Optimistic Update
        setOpportunities(prev => prev.map(o =>
            o.id === id ? { ...o, stage: newStage } : o
        ));

        const result = await updateOpportunityStageAction(id, newStage);

        if (result?.error) {
            toast.error("Error al mover la oportunidad");
            setOpportunities(prev => prev.map(o =>
                o.id === id ? { ...o, stage: opportunity.stage } : o
            ));
        } else {
            toast.success(`Oportunidad movida a ${STAGE_LABELS[newStage]}`);
        }
    };

    const getColumnTotal = (stage: string) => {
        return opportunities
            .filter(o => o.stage === stage)
            .reduce((sum, o) => sum + (o.value || 0), 0);
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            {/* 💎 1. PIPELINE TACTICAL SUMMARY */}
            <div className="px-6">
                <div className="flex items-center gap-6 mb-8">
                    <div className="h-12 w-12 bg-slate-950 rounded-[1.2rem] flex items-center justify-center text-white shadow-active rotate-3">
                        <LayoutDashboard className="h-6 w-6 text-indigo-400" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black text-slate-950 tracking-tighter italic uppercase leading-none">Radar de Conversión</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] italic">MÁTRICAS DE RENDIMIENTO POR ETAPA</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6">
                    {STAGES.map(stage => {
                        const count = opportunities.filter(o => o.stage === stage).length;
                        const value = getColumnTotal(stage);
                        const Icon = STAGE_ICONS[stage];

                        return (
                            <Card key={stage} className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden group hover:-translate-y-2 transition-all duration-500 relative border border-slate-50">
                                <CardContent className="p-8 relative z-10">
                                    <div className="flex justify-between items-start mb-8">
                                        <div className={cn(
                                            "h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-active transition-all group-hover:rotate-12 duration-500",
                                            STAGE_HEADER_COLORS[stage]
                                        )}>
                                            <Icon className="h-7 w-7" />
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-3xl font-black text-slate-950 tracking-tighter italic leading-none">{count}</span>
                                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">OPS</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic leading-none truncate">{STAGE_LABELS[stage]}</p>
                                        <p className="text-xl font-black text-slate-950 tracking-tighter italic leading-none truncate">
                                            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)}
                                        </p>
                                    </div>
                                    <div className="absolute top-3 right-3 h-1.5 w-1.5 rounded-full bg-slate-100 group-hover:bg-indigo-500 transition-colors" />
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* 🏗️ 2. KANBAN BOARD INDUSTRIAL V3 */}
            <div className="px-6">
                <div className="flex items-center gap-6 mb-8">
                    <div className="h-10 w-10 bg-slate-50 border border-slate-100 rounded-[1rem] flex items-center justify-center text-slate-400 shadow-inner group-hover:rotate-12 transition-transform">
                        <ArrowRight className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-2xl font-black text-slate-950 tracking-tighter italic uppercase leading-none">Flujo Operativo de Ventas</h2>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.6em] italic">GESTIÓN DINÁMICA DE OPORTUNIDADES</p>
                    </div>
                </div>

                <div className="w-full pb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                        {STAGES.map(stage => {
                            const stageOpportunities = opportunities.filter(o => o.stage === stage);
                            const totalValue = getColumnTotal(stage);
                            const Icon = STAGE_ICONS[stage];

                            return (
                                <div key={stage} className="flex flex-col gap-6 p-4 rounded-[3rem] bg-slate-50/50 border border-slate-100/50 hover:bg-slate-50 transition-colors relative">
                                    {/* Column HEADER - Tactical version */}
                                    <div className="flex flex-col gap-4 px-2">
                                        <div className="flex justify-between items-start">
                                            <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-active rotate-3", STAGE_HEADER_COLORS[stage])}>
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <Badge variant="outline" className="border-slate-200 text-slate-400 text-[8px] font-black italic rounded-full px-3 py-0.5">{stageOpportunities.length} ACTIVAS</Badge>
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="font-black text-slate-950 text-[13px] uppercase tracking-widest italic leading-none">{STAGE_LABELS[stage]}</h3>
                                            <div className="h-1 w-12 bg-indigo-500/20 rounded-full" />
                                        </div>
                                    </div>

                                    {/* Cards Scroll Area */}
                                    <div className="flex flex-col gap-4 min-h-[500px] max-h-[700px] overflow-y-auto pr-1 pb-10 custom-scrollbar scroll-smooth">
                                        {stageOpportunities.map(opp => (
                                            <OpportunityCard
                                                key={opp.id}
                                                opportunity={opp}
                                                onMove={handleMove}
                                            />
                                        ))}
                                        {stageOpportunities.length === 0 && (
                                            <div className="h-40 border-4 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 group/empty bg-white/50">
                                                <div className="h-12 w-12 rounded-full border border-slate-100 flex items-center justify-center">
                                                    <Sparkles className="h-6 w-6 text-slate-200 group-hover/empty:text-indigo-400 transition-colors animate-pulse" />
                                                </div>
                                                <span className="text-slate-200 text-[10px] font-black uppercase tracking-[0.3em] italic">Radar Limpio</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Column Footer Industrial */}
                                    <div className="px-6 py-5 bg-slate-950 rounded-[2rem] shadow-active flex flex-col gap-1 border border-white/5">
                                        <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.4em] italic">Capacidad Proyectada</span>
                                        <span className="text-lg font-black text-white tracking-tighter italic">
                                            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalValue)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
