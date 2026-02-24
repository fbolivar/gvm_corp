"use client"

import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { ArrowLeft, ArrowRight, Building2, Calendar, Target, TrendingUp, Sparkles } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/shared/lib/utils"

interface Props {
    opportunity: any
    onMove: (id: string, direction: 'PREV' | 'NEXT') => void
}

export function OpportunityCard({ opportunity, onMove }: Props) {
    const probabilityColor =
        opportunity.probability >= 80 ? "text-emerald-600 bg-emerald-50 border-emerald-100" :
            opportunity.probability >= 50 ? "text-amber-600 bg-amber-50 border-amber-100" :
                "text-slate-500 bg-slate-50 border-slate-100";

    const valueFormatted = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(opportunity.value);

    const stageIndicator =
        opportunity.stage === 'CLOSED_WON' ? 'bg-emerald-500' :
            opportunity.stage === 'CLOSED_LOST' ? 'bg-rose-500' :
                'bg-indigo-600';

    return (
        <Card className="bg-white border-none shadow-premium hover:shadow-active transition-all duration-700 cursor-pointer group relative overflow-hidden rounded-[2rem] animate-in fade-in slide-in-from-bottom-4 border-slate-50/50">
            {/* Visual Indicator Line (Industrial vertical bar) */}
            <div className={cn("absolute top-0 left-0 w-2 h-full rounded-full transition-all group-hover:w-3 duration-500", stageIndicator)} />

            <CardContent className="p-6 pl-10 space-y-4">
                {/* Header: Name & Probability */}
                <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="font-black text-slate-950 text-base leading-tight tracking-tight group-hover:text-indigo-600 transition-colors italic line-clamp-2 uppercase">
                            {opportunity.name}
                        </h4>
                        <div className="flex items-center gap-3 mt-3">
                            <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-950 group-hover:text-white transition-all duration-500 shadow-inner">
                                <Building2 className="h-4 w-4" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic truncate max-w-[150px]">
                                {opportunity.parties?.trade_name || opportunity.leads?.company_name || 'Prospecto Radar'}
                            </span>
                        </div>
                    </div>
                    <Badge variant="outline" className={cn("px-4 py-1.5 font-black text-[10px] uppercase tracking-tighter shrink-0 border-[1.5px] rounded-full shadow-sm italic", probabilityColor)}>
                        {opportunity.probability}% <Target className="ml-2 h-3.5 w-3.5" />
                    </Badge>
                </div>

                {/* Body: Value & Status Indicators */}
                <div className="flex items-center justify-between py-4 border-y border-slate-50 relative overflow-hidden group/val">
                    <div className="absolute inset-0 bg-slate-50/50 translate-x-full group-hover/val:translate-x-0 transition-transform duration-700" />
                    <div className="flex flex-col relative z-10">
                        <span className="text-[8px] text-slate-300 uppercase font-black tracking-[0.4em] italic leading-none mb-1">Cierre Proyectado</span>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-slate-950 tracking-tighter italic">{valueFormatted}</span>
                            <TrendingUp className="h-3 w-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity animate-bounce" />
                        </div>
                    </div>
                </div>

                {/* Footer: Date & Navigation Controls */}
                <div className="flex items-center justify-between gap-4 pt-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl hover:bg-slate-50 text-slate-300 hover:text-slate-950 transition-all disabled:opacity-20 shadow-sm border border-slate-50"
                        onClick={(e) => {
                            e.stopPropagation();
                            onMove(opportunity.id, 'PREV');
                        }}
                        disabled={['PROSPECTING', 'CLOSED_WON', 'CLOSED_LOST'].includes(opportunity.stage)}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex-1 flex items-center justify-center gap-3 h-10 bg-slate-950 rounded-xl shadow-active group/date border border-white/5 px-2">
                        <Calendar className="h-3.5 w-3.5 text-indigo-400 group-hover/date:rotate-12 transition-transform" />
                        <span className="text-[9px] text-white/50 font-black uppercase tracking-[0.2em] italic">
                            {opportunity.expected_close_date ? format(new Date(opportunity.expected_close_date), 'MMM d, yyyy', { locale: es }) : 'SIN FECHA'}
                        </span>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl hover:bg-indigo-500 hover:text-white text-slate-300 hover:shadow-active transition-all disabled:opacity-20 shadow-sm border border-slate-50"
                        onClick={(e) => {
                            e.stopPropagation();
                            onMove(opportunity.id, 'NEXT');
                        }}
                        disabled={['CLOSED_WON', 'CLOSED_LOST'].includes(opportunity.stage)}
                    >
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
