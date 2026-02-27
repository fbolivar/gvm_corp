"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { updateOpportunityStageAction } from "@/features/crm/actions"
import { CheckCircle2, XCircle, ChevronRight, ChevronLeft, Loader2 } from "lucide-react"
import { cn } from "@/shared/lib/utils"

const STAGE_ORDER = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON'] as const
type Stage = typeof STAGE_ORDER[number] | 'CLOSED_LOST'

interface Props {
    opportunityId: string
    currentStage: Stage
}

export function OpportunityStageButtons({ opportunityId, currentStage }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState<string | null>(null)

    const isClosed = currentStage === 'CLOSED_WON' || currentStage === 'CLOSED_LOST'
    const currentIdx = STAGE_ORDER.indexOf(currentStage as any)

    const handleMove = async (stage: string) => {
        setLoading(stage)
        await updateOpportunityStageAction(opportunityId, stage)
        router.refresh()
        setLoading(null)
    }

    if (isClosed) {
        return (
            <Button
                onClick={() => handleMove('PROSPECTING')}
                variant="outline"
                className="h-12 px-6 rounded-xl border-slate-200 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50"
                disabled={!!loading}
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reabrir Oportunidad'}
            </Button>
        )
    }

    return (
        <div className="flex items-center gap-3 flex-wrap">
            {currentIdx > 0 && (
                <Button
                    onClick={() => handleMove(STAGE_ORDER[currentIdx - 1])}
                    variant="outline"
                    size="sm"
                    className="h-10 px-4 rounded-xl border-slate-200 text-[10px] font-black uppercase tracking-widest"
                    disabled={!!loading}
                >
                    {loading === STAGE_ORDER[currentIdx - 1]
                        ? <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        : <ChevronLeft className="h-3.5 w-3.5 mr-1.5" />
                    }
                    Retroceder
                </Button>
            )}

            {currentIdx < STAGE_ORDER.length - 1 && (
                <Button
                    onClick={() => handleMove(STAGE_ORDER[currentIdx + 1])}
                    className={cn(
                        "h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest",
                        "bg-indigo-600 hover:bg-indigo-700 text-white shadow-active"
                    )}
                    disabled={!!loading}
                >
                    {loading === STAGE_ORDER[currentIdx + 1]
                        ? <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        : <ChevronRight className="h-3.5 w-3.5 mr-1.5" />
                    }
                    Avanzar
                </Button>
            )}

            <Button
                onClick={() => handleMove('CLOSED_WON')}
                className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!!loading || (currentStage as string) === 'CLOSED_WON'}
            >
                {loading === 'CLOSED_WON'
                    ? <Loader2 className="h-3 w-3 animate-spin mr-2" />
                    : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                }
                Ganado
            </Button>

            <Button
                onClick={() => handleMove('CLOSED_LOST')}
                variant="outline"
                className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-rose-200 text-rose-600 hover:bg-rose-50"
                disabled={!!loading}
            >
                {loading === 'CLOSED_LOST'
                    ? <Loader2 className="h-3 w-3 animate-spin mr-2" />
                    : <XCircle className="h-3.5 w-3.5 mr-1.5" />
                }
                Perdido
            </Button>
        </div>
    )
}
