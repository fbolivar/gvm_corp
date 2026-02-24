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
        <div className="space-y-12">
            {/* 🛠️ VISTA CONTROL PANEL INDUSTRIAL V3 */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-8 bg-slate-50/50 p-4 rounded-[2.5rem] border border-slate-100/50">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setView('grid')}
                        className={cn(
                            "h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] gap-3 transition-all italic",
                            view === 'grid'
                                ? "bg-slate-950 text-white shadow-active scale-105"
                                : "text-slate-400 hover:text-slate-600 hover:bg-white"
                        )}
                    >
                        <LayoutGrid className={cn("h-4 w-4", view === 'grid' ? "text-indigo-400" : "")} />
                        Grilla Táctica
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setView('list')}
                        className={cn(
                            "h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] gap-3 transition-all italic",
                            view === 'list'
                                ? "bg-slate-950 text-white shadow-active scale-105"
                                : "text-slate-400 hover:text-slate-600 hover:bg-white"
                        )}
                    >
                        <List className={cn("h-4 w-4", view === 'list' ? "text-indigo-400" : "")} />
                        Listado Maestro
                    </Button>
                </div>

                <div className="flex items-center gap-4 px-6 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">
                        Visualización Activa: <span className="text-indigo-600 ml-2">{view === 'grid' ? 'Tactical Cards' : 'Master Ledger'}</span>
                    </span>
                </div>
            </div>

            <div className="animate-in fade-in zoom-in-95 duration-500">
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
                onSuccess={() => {
                    // Logic for success
                }}
            />
        </div>
    );
}
