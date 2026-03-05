"use client"

import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { ArrowLeft, ArrowRight, Building2, Calendar } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/shared/lib/utils"

interface Props {
    opportunity: Record<string, unknown>
    onMove: (id: string, direction: 'PREV' | 'NEXT') => void
}

export function OpportunityCard({ opportunity, onMove }: Props) {
    const probability = Number(opportunity.probability) || 0;
    const probabilityColor =
        probability >= 80 ? "text-emerald-600 bg-emerald-50 border-emerald-100" :
            probability >= 50 ? "text-amber-600 bg-amber-50 border-amber-100" :
                "text-slate-500 bg-slate-50 border-slate-100";

    const valueFormatted = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(Number(opportunity.value) || 0);

    const stageIndicator =
        opportunity.stage === 'CLOSED_WON' ? 'bg-emerald-500' :
            opportunity.stage === 'CLOSED_LOST' ? 'bg-rose-500' :
                'bg-indigo-500';

    const parties = opportunity.parties as Record<string, unknown> | null;
    const leads = opportunity.leads as Record<string, unknown> | null;

    return (
        <Card className="bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden rounded-xl">
            <div className={cn("absolute top-0 left-0 w-1 h-full rounded-full", stageIndicator)} />

            <CardContent className="p-3 pl-4 space-y-2">
                {/* Header */}
                <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-slate-900 text-xs leading-tight line-clamp-2">
                            {String(opportunity.name)}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1">
                            <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="text-[10px] text-slate-400 truncate">
                                {String(parties?.trade_name || leads?.company_name || 'Sin asignar')}
                            </span>
                        </div>
                    </div>
                    <Badge variant="outline" className={cn("px-2 py-0.5 font-semibold text-[10px] shrink-0 border rounded-full", probabilityColor)}>
                        {probability}%
                    </Badge>
                </div>

                {/* Value */}
                <div className="py-1.5 border-t border-slate-50">
                    <span className="text-[10px] text-slate-400 block">Valor</span>
                    <span className="text-sm font-bold text-slate-900">{valueFormatted}</span>
                </div>

                {/* Footer: Date & Nav */}
                <div className="flex items-center justify-between gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md hover:bg-slate-100 text-slate-300 hover:text-slate-900 disabled:opacity-20"
                        onClick={(e) => { e.stopPropagation(); onMove(String(opportunity.id), 'PREV'); }}
                        disabled={['PROSPECTING', 'CLOSED_WON', 'CLOSED_LOST'].includes(String(opportunity.stage))}
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>

                    <div className="flex-1 flex items-center justify-center gap-1.5 h-7 bg-slate-50 rounded-md px-2">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span className="text-[10px] text-slate-500 font-medium">
                            {opportunity.expected_close_date
                                ? format(new Date(String(opportunity.expected_close_date)), 'dd MMM yyyy', { locale: es })
                                : 'Sin fecha'}
                        </span>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md hover:bg-indigo-50 hover:text-indigo-600 text-slate-300 disabled:opacity-20"
                        onClick={(e) => { e.stopPropagation(); onMove(String(opportunity.id), 'NEXT'); }}
                        disabled={['CLOSED_WON', 'CLOSED_LOST'].includes(String(opportunity.stage))}
                    >
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
