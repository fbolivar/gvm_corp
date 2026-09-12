"use client"

import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { ArrowLeft, ArrowRight, Building2, Calendar, XCircle, RotateCcw } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/shared/lib/utils"
import { useRouter } from "next/navigation"
import { Hint } from "@/shared/components/ui/hint"

interface Props {
    opportunity: Record<string, unknown>
    onMove: (id: string, direction: 'PREV' | 'NEXT') => void
    onLose?: (id: string) => void
    onReopen?: (id: string) => void
}

export function OpportunityCard({ opportunity, onMove, onLose, onReopen }: Props) {
    const router = useRouter();
    const stage = String(opportunity.stage);
    const isClosed = stage === 'CLOSED_WON' || stage === 'CLOSED_LOST';
    const isFirstOpen = stage === 'PROSPECTING';
    const oppId = String(opportunity.id);
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
        <Card
            className="bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden rounded-xl"
            onClick={() => router.push(`/crm/opportunities/${opportunity.id}`)}
        >
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

                {/* Date */}
                <div className="flex items-center justify-center gap-1.5 h-7 bg-slate-50 rounded-md px-2">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    <span className="text-[10px] text-slate-500 font-medium">
                        {opportunity.expected_close_date
                            ? format(new Date(String(opportunity.expected_close_date)), 'dd MMM yyyy', { locale: es })
                            : 'Sin fecha'}
                    </span>
                </div>

                {/* Footer: Stage actions */}
                {isClosed ? (
                    <Hint label="Reabrir en Prospección" side="top">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-7 rounded-md border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 text-[10px] font-bold uppercase tracking-wider"
                            onClick={(e) => { e.stopPropagation(); onReopen?.(oppId); }}
                        >
                            <RotateCcw className="h-3 w-3 mr-1.5" />
                            Reabrir
                        </Button>
                    </Hint>
                ) : (
                    <div className="flex items-center justify-between gap-1">
                        <Hint label="Etapa anterior" side="top">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-md hover:bg-slate-100 text-slate-300 hover:text-slate-900 disabled:opacity-20"
                                onClick={(e) => { e.stopPropagation(); onMove(oppId, 'PREV'); }}
                                disabled={isFirstOpen}
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                            </Button>
                        </Hint>

                        <Hint label="Marcar como perdida" side="top">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-md text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                                onClick={(e) => { e.stopPropagation(); onLose?.(oppId); }}
                            >
                                <XCircle className="h-3.5 w-3.5" />
                            </Button>
                        </Hint>

                        <Hint label={stage === 'NEGOTIATION' ? 'Marcar como ganada' : 'Siguiente etapa'} side="top">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-md hover:bg-indigo-50 hover:text-indigo-600 text-slate-300"
                                onClick={(e) => { e.stopPropagation(); onMove(oppId, 'NEXT'); }}
                            >
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                        </Hint>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
