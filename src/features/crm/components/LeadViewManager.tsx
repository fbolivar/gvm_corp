"use client"

import { useState, useTransition } from "react"
import { Lead } from "../types"
import { LeadList } from "./LeadList"
import { LeadTable } from "./LeadTable"
import { Button } from "@/shared/components/ui/button"
import { LayoutGrid, List } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { LeadConversionDialog } from "./LeadConversionDialog"
import { deleteLeadAction } from "../actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useConfirm } from "@/shared/hooks/useConfirm"

interface Props {
    leads: Lead[]
}

export function LeadViewManager({ leads }: Props) {
    const [view, setView] = useState<'grid' | 'list'>('list');
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
    const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()
    const [ConfirmDialogEl, confirmFn] = useConfirm()

    const handleConvertClick = (lead: Lead) => {
        setSelectedLead(lead)
        setIsConvertDialogOpen(true)
    }

    const handleDelete = async (id: string) => {
        const lead = leads.find(l => l.id === id)
        const ok = await confirmFn({ title: "Confirmar accion", description: `¿Eliminar el prospecto "${lead?.name || ''}"? Esta acción no se puede deshacer.`, variant: "danger", confirmLabel: "Confirmar" })
        if (!ok) return

        startTransition(async () => {
            const result = await deleteLeadAction(id)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success("Prospecto eliminado")
                router.refresh()
            }
        })
    }

    return (
        <div className="space-y-4">
            {/* View Toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setView('grid')}
                        className={cn(
                            "h-8 px-3 rounded-md text-xs font-semibold gap-2 transition-all",
                            view === 'grid'
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        Grilla
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
                    {leads.length} prospectos
                </span>
            </div>

            <div className={isPending ? "opacity-50 pointer-events-none" : ""}>
                {view === 'grid' ? (
                    <LeadList leads={leads} />
                ) : (
                    <LeadTable
                        leads={leads}
                        onConvert={handleConvertClick}
                        onDelete={handleDelete}
                    />
                )}
            </div>

            <LeadConversionDialog
                open={isConvertDialogOpen}
                onOpenChange={setIsConvertDialogOpen}
                lead={selectedLead}
                onSuccess={() => {
                    router.refresh()
                }}
            />
            {ConfirmDialogEl}
        </div>
    );
}
