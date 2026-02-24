"use client"

import { useState } from "react"
import { OpportunityKanban } from "./OpportunityKanban"
import { OpportunityTable } from "./OpportunityTable"
import { Button } from "@/shared/components/ui/button"
import { LayoutGrid, List } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface Props {
    opportunities: any[]
}

export function PipelineViewManager({ opportunities }: Props) {
    const [view, setView] = useState<'kanban' | 'list'>('kanban');

    return (
        <div className="space-y-10">
            {/* View Toggle Bar */}
            <div className="flex justify-start gap-1 bg-slate-100/50 p-1.5 rounded-2xl w-fit">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setView('kanban')}
                    className={cn(
                        "h-10 px-6 rounded-xl font-black text-[9px] uppercase tracking-widest gap-2 transition-all",
                        view === 'kanban' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    <LayoutGrid className="h-4 w-4" />
                    Kanban
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setView('list')}
                    className={cn(
                        "h-10 px-6 rounded-xl font-black text-[9px] uppercase tracking-widest gap-2 transition-all",
                        view === 'list' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    <List className="h-4 w-4" />
                    Listado Industrial
                </Button>
            </div>

            {/* View Content */}
            <div className="animate-in fade-in zoom-in-95 duration-500">
                {view === 'kanban' ? (
                    <OpportunityKanban initialOpportunities={opportunities} />
                ) : (
                    <OpportunityTable opportunities={opportunities} />
                )}
            </div>
        </div>
    );
}
