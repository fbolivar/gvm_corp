"use client"

import { useState } from "react"
import { OpportunityStage } from "../types"
import { OpportunityCard } from "./OpportunityCard"
import { updateOpportunityStageAction } from "../actions"
import { crmService } from "../services/crmService"
import { toast } from "sonner"
import { cn } from "@/shared/lib/utils"
import { Badge } from "@/shared/components/ui/badge"
import {
    Target,
    Zap,
    FileText,
    MessageSquare,
    Trophy,
    XCircle,
    Sparkles
} from "lucide-react"

interface Props {
    initialOpportunities: Record<string, unknown>[]
}

const STAGES: OpportunityStage[] = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];

const STAGE_LABELS: Record<OpportunityStage, string> = {
    'PROSPECTING': 'Prospección',
    'QUALIFICATION': 'Calificación',
    'PROPOSAL': 'Propuesta',
    'NEGOTIATION': 'Negociación',
    'CLOSED_WON': 'Ganada',
    'CLOSED_LOST': 'Perdida'
};

const STAGE_COLORS: Record<OpportunityStage, string> = {
    'PROSPECTING': 'bg-blue-500',
    'QUALIFICATION': 'bg-indigo-500',
    'PROPOSAL': 'bg-violet-500',
    'NEGOTIATION': 'bg-amber-500',
    'CLOSED_WON': 'bg-emerald-500',
    'CLOSED_LOST': 'bg-rose-500'
};

const STAGE_ICONS: Record<OpportunityStage, React.ComponentType<{ className?: string }>> = {
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

        const currentIndex = STAGES.indexOf(opportunity.stage as OpportunityStage);
        const newIndex = direction === 'NEXT' ? currentIndex + 1 : currentIndex - 1;

        if (newIndex < 0 || newIndex >= STAGES.length) return;

        const newStage = STAGES[newIndex];
        const newProbability = crmService.getStageProbability(newStage);

        // Optimistic update — stage + probability
        setOpportunities(prev => prev.map(o =>
            o.id === id ? { ...o, stage: newStage, probability: newProbability } : o
        ));

        const result = await updateOpportunityStageAction(id as string, newStage);

        if (result?.error) {
            toast.error("Error al mover la oportunidad");
            setOpportunities(prev => prev.map(o =>
                o.id === id ? { ...o, stage: opportunity.stage, probability: opportunity.probability } : o
            ));
        } else {
            toast.success(`Movida a ${STAGE_LABELS[newStage]} (${newProbability}%)`);
        }
    };

    const getColumnTotal = (stage: string) => {
        return opportunities
            .filter(o => o.stage === stage)
            .reduce((sum, o) => sum + (Number(o.value) || 0), 0);
    };

    return (
        <div className="space-y-4">
            {/* Kanban Board */}
            <div className="w-full overflow-x-auto pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 min-w-[900px]">
                    {STAGES.map(stage => {
                        const stageOpps = opportunities.filter(o => o.stage === stage);
                        const totalValue = getColumnTotal(stage);
                        const Icon = STAGE_ICONS[stage];

                        return (
                            <div key={stage} className="flex flex-col gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                                {/* Column Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center text-white", STAGE_COLORS[stage])}>
                                            <Icon className="h-3.5 w-3.5" />
                                        </div>
                                        <h3 className="font-semibold text-slate-900 text-xs">{STAGE_LABELS[stage]}</h3>
                                    </div>
                                    <Badge variant="outline" className="border-slate-200 text-slate-400 text-[10px] font-medium rounded-full px-2 py-0.5">
                                        {stageOpps.length}
                                    </Badge>
                                </div>

                                {/* Cards */}
                                <div className="flex flex-col gap-2 min-h-[200px] max-h-[500px] overflow-y-auto">
                                    {stageOpps.map(opp => (
                                        <OpportunityCard
                                            key={String(opp.id)}
                                            opportunity={opp}
                                            onMove={handleMove}
                                        />
                                    ))}
                                    {stageOpps.length === 0 && (
                                        <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2">
                                            <Sparkles className="h-4 w-4 text-slate-300" />
                                            <span className="text-slate-300 text-[10px] font-medium">Vacío</span>
                                        </div>
                                    )}
                                </div>

                                {/* Column Footer */}
                                <div className="px-3 py-2 bg-white rounded-lg border border-slate-100">
                                    <span className="text-[10px] text-slate-400 font-medium block">Total</span>
                                    <span className="text-sm font-bold text-slate-900">
                                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalValue)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
