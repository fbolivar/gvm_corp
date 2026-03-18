"use client"

import { useState } from "react"
import { OpportunityKanban } from "./OpportunityKanban"
import { OpportunityTable } from "./OpportunityTable"
import { Button } from "@/shared/components/ui/button"
import { LayoutGrid, List } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { deleteOpportunityAction } from "../actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useConfirm } from "@/shared/hooks/useConfirm"

interface Props {
    opportunities: Record<string, unknown>[]
}

export function PipelineViewManager({ opportunities }: Props) {
    const [view, setView] = useState<'kanban' | 'list'>('kanban');
    const router = useRouter();
    const [ConfirmDialogEl, confirmFn] = useConfirm();

    const handleDelete = async (id: string) => {
        const ok = await confirmFn({ title: "Confirmar accion", description: "¿Eliminar esta oportunidad? Esta acción no se puede deshacer.", variant: "danger", confirmLabel: "Confirmar" })
        if (!ok) return;
        const result = await deleteOpportunityAction(id);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Oportunidad eliminada");
            router.refresh();
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setView('kanban')}
                        className={cn(
                            "h-8 px-3 rounded-md text-xs font-semibold gap-2 transition-all",
                            view === 'kanban'
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        Kanban
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setView('list')}
                        className={cn(
                            "h-8 px-3 rounded-md text-xs font-semibold gap-2 transition-all",
                            view === 'list'
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <List className="h-3.5 w-3.5" />
                        Tabla
                    </Button>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                    {opportunities.length} oportunidades
                </span>
            </div>

            <div>
                {view === 'kanban' ? (
                    <OpportunityKanban initialOpportunities={opportunities} />
                ) : (
                    <OpportunityTable opportunities={opportunities} onDelete={handleDelete} />
                )}
            </div>
            {ConfirmDialogEl}
        </div>
    );
}
