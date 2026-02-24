"use client"

import { useState } from "react"
import { Lead } from "../types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Edit2, UserCheck, Trash2, User, Eye, Building2 } from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/shared/components/ui/card"
import { cn } from "@/shared/lib/utils"
import { LeadConversionDialog } from "./LeadConversionDialog"
import { Sparkles, Mail, Phone } from "lucide-react"

interface LeadListProps {
    leads: Lead[]
    onStatusChange?: (id: string, newStatus: string) => void
    onDelete?: (id: string) => void
}

const statusConfig: Record<string, { label: string; style: string; color: string }> = {
    'NEW': { label: 'RADICADO NUEVO', style: 'border-blue-200 text-blue-600 bg-blue-50/50', color: '#3b82f6' },
    'CONTACTED': { label: 'EN GESTIÓN', style: 'border-amber-200 text-amber-600 bg-amber-50/50', color: '#f59e0b' },
    'QUALIFIED': { label: 'CERTIFICADO', style: 'border-indigo-200 text-indigo-600 bg-indigo-50/50', color: '#6366f1' },
    'LOST': { label: 'DESCARTADO', style: 'border-rose-200 text-rose-600 bg-rose-50/50', color: '#f43f5e' },
    'CONVERTED': { label: 'CONVERTIDO CLIENTE', style: 'border-emerald-200 text-emerald-600 bg-emerald-50/50', color: '#10b981' },
}

export function LeadList({ leads, onDelete }: LeadListProps) {
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
    const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false)

    const handleConvertClick = (lead: Lead) => {
        setSelectedLead(lead)
        setIsConvertDialogOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {leads.length === 0 ? (
                    <div className="col-span-full py-40 text-center bg-white rounded-[3.5rem] shadow-premium border border-slate-50 flex flex-col items-center gap-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                            <User className="h-64 w-64" />
                        </div>
                        <Sparkles className="h-20 w-20 text-slate-100 animate-pulse" />
                        <p className="text-sm font-black uppercase tracking-[0.6em] italic text-slate-300">Radar de Prospectos Limpio</p>
                    </div>
                ) : (
                    leads.map((lead) => {
                        const status = statusConfig[lead.status] || { label: lead.status, style: 'border-slate-100 text-slate-400 bg-slate-50', color: '#94a3b8' }
                        return (
                            <Card key={lead.id} className="border-none shadow-premium rounded-[3rem] bg-white group hover:-translate-y-3 transition-all duration-700 overflow-hidden relative border border-slate-50/50">
                                {/* Tactical vertical indicator */}
                                <div className={cn("absolute top-0 left-0 w-2.5 h-full transition-all group-hover:w-4 duration-500", status.style.split(' ').find(s => s.startsWith('bg-')))} />

                                <CardContent className="p-10 pl-14 space-y-8">
                                    {/* Header: Name & Status */}
                                    <div className="flex justify-between items-start gap-6">
                                        <div className="space-y-4">
                                            <h3 className="text-2xl font-black text-slate-950 italic tracking-tighter uppercase leading-none group-hover:text-indigo-600 transition-colors duration-500">{lead.name}</h3>
                                            <div className="flex flex-wrap items-center gap-4">
                                                <Badge variant="outline" className={cn("border-[1.5px] px-4 py-1.5 font-black text-[9px] uppercase tracking-[0.3em] flex items-center gap-2.5 rounded-full shadow-active italic leading-none whitespace-nowrap", status.style)}>
                                                    <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse shadow-[0_0_8px_currentColor]" />
                                                    {status.label}
                                                </Badge>
                                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest italic leading-none">
                                                        RAD: {lead.created_at ? new Date(lead.created_at).toLocaleDateString('es-CO') : 'TBD'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="h-14 w-14 rounded-2xl bg-slate-950 flex items-center justify-center text-white group-hover:rotate-12 group-hover:scale-110 transition-all duration-700 shadow-active shrink-0">
                                            <User className="h-7 w-7 text-indigo-400" />
                                        </div>
                                    </div>

                                    {/* Info Body Industrial */}
                                    <div className="space-y-5 pt-8 border-t border-slate-50 relative">
                                        <div className="flex items-center gap-4 group/item">
                                            <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover/item:text-indigo-500 group-hover/item:bg-white transition-all shadow-inner border border-transparent group-hover/item:border-slate-100">
                                                <Building2 className="h-5 w-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em] italic leading-none mb-1">Entrada Corporativa</span>
                                                <span className="text-xs font-black text-slate-950 uppercase tracking-tight italic">
                                                    {lead.company_name || 'Particular RAD-01'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-center gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100 group/source">
                                                <div className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_6px_#6366f1]" />
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Origen</span>
                                                    <span className="text-[10px] font-black text-slate-950 uppercase tracking-widest leading-none">{lead.source || 'DIRECTO'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-2xl shadow-active">
                                                <Eye className="h-4 w-4 text-indigo-400" />
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-white/30 uppercase tracking-widest leading-none mb-1 text-center">Trazabilidad</span>
                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none text-center">EXPLORAR</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions Industrial Hub */}
                                    <div className="flex items-center justify-between pt-8 border-t border-slate-50">
                                        <div className="flex gap-3">
                                            <Button variant="outline" size="icon" asChild className="h-12 w-12 rounded-2xl border-slate-100 bg-white hover:bg-slate-950 hover:text-white hover:border-slate-950 transition-all shadow-premium group/edit">
                                                <Link href={`/crm/leads/${lead.id}/edit`}>
                                                    <Edit2 className="h-5 w-5 transition-transform group-hover/edit:scale-110" />
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => lead.id && onDelete?.(lead.id)}
                                                className="h-12 w-12 rounded-2xl border-slate-100 bg-white hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all shadow-premium group/del"
                                            >
                                                <Trash2 className="h-5 w-5 transition-transform group-hover/del:scale-110" />
                                            </Button>
                                        </div>
                                        <Button
                                            onClick={() => handleConvertClick(lead)}
                                            disabled={lead.status === 'CONVERTED'}
                                            className="h-14 px-8 rounded-2xl bg-slate-950 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-[0.4em] shadow-active transition-all hover:scale-105 active:scale-95 disabled:opacity-20 italic flex items-center gap-4 border-none group/conv"
                                        >
                                            <UserCheck className="h-5 w-5 text-emerald-400 group-hover/conv:scale-110 transition-transform" />
                                            {lead.status === 'CONVERTED' ? 'CERTIFICADO' : 'CONVERTIR'}
                                        </Button>
                                    </div>
                                </CardContent>
                                {/* Decorative scanline for card */}
                                <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/5 blur-[80px] rounded-full -translate-y-20 translate-x-10 pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />
                            </Card>
                        )
                    })
                )}
            </div>

            <LeadConversionDialog
                open={isConvertDialogOpen}
                onOpenChange={setIsConvertDialogOpen}
                lead={selectedLead}
                onSuccess={() => {
                    // Status updated in parent or via revalidatePath
                }}
            />
        </div>
    )
}
