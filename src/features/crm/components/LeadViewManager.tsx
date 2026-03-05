"use client"

import { useState } from "react"
import { Lead } from "../types"
import { LeadList } from "./LeadList"
import { LeadTable } from "./LeadTable"
import { Button } from "@/shared/components/ui/button"
import { LayoutGrid, List } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { LeadConversionDialog } from "./LeadConversionDialog"

interface Props {
    leads: Lead[]
}

export function LeadViewManager({ leads }: Props) {
    const [view, setView] = useState<'grid' | 'list'>('list');
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
    const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false)

    const handleConvertClick = (lead: Lead) => {
        setSelectedLead(lead)
        setIsConvertDialogOpen(true)
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

            <div>
                {view === 'grid' ? (
                    <LeadList leads={leads} />
                ) : (
                    <LeadTable
                        leads={leads}
                        onConvert={handleConvertClick}
                    />
                )}
            </div>

            <LeadConversionDialog
                open={isConvertDialogOpen}
                onOpenChange={setIsConvertDialogOpen}
                lead={selectedLead}
                onSuccess={() => {}}
            />
        </div>
    );
}
