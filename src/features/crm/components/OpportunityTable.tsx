"use client"

import { Opportunity, OpportunityStage } from "../types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
    Edit2,
    Trash2,
    Target,
    Calendar,
    DollarSign,
    BarChart2,
    MoreHorizontal,
    Eye,
    TrendingUp,
    Briefcase
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/shared/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/shared/components/ui/dropdown-menu"

interface OpportunityTableProps {
    opportunities: any[]
    onDelete?: (id: string) => void
}

const stageConfig: Record<OpportunityStage, { label: string; style: string; icon: any }> = {
    'PROSPECTING': { label: 'Prospección', style: 'bg-slate-100 text-slate-500', icon: Target },
    'QUALIFICATION': { label: 'Calificación', style: 'bg-blue-50 text-blue-600', icon: BarChart2 },
    'PROPOSAL': { label: 'Propuesta', style: 'bg-amber-50 text-amber-600', icon: Briefcase },
    'NEGOTIATION': { label: 'Negociación', style: 'bg-indigo-50 text-indigo-600', icon: TrendingUp },
    'CLOSED_WON': { label: 'Ganada', style: 'bg-emerald-50 text-emerald-600', icon: DollarSign },
    'CLOSED_LOST': { label: 'Perdida', style: 'bg-rose-50 text-rose-500', icon: Trash2 },
}

export function OpportunityTable({ opportunities, onDelete }: OpportunityTableProps) {
    return (
        <div className="bg-white rounded-[2.5rem] shadow-premium overflow-hidden border border-slate-50">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-50 h-16">
                        <TableHead className="pl-8 text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Oportunidad</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Etapa</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Valor</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Probabilidad</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Cierre Estimado</TableHead>
                        <TableHead className="pr-8 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {opportunities.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-32 text-center italic text-slate-300">
                                No hay oportunidades activas.
                            </TableCell>
                        </TableRow>
                    ) : (
                        opportunities.map((opp) => {
                            const stage = stageConfig[opp.stage as OpportunityStage] || stageConfig.PROSPECTING;
                            const StageIcon = stage.icon;

                            return (
                                <TableRow key={opp.id} className="group hover:bg-slate-50/50 transition-all border-slate-50 h-20">
                                    {/* Name & Account */}
                                    <TableCell className="pl-8">
                                        <div className="flex items-center gap-4">
                                            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shadow-sm transition-all group-hover:rotate-6", stage.style)}>
                                                <StageIcon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 italic tracking-tighter uppercase leading-none mb-1 group-hover:text-indigo-600 transition-colors">
                                                    {opp.name}
                                                </p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {opp.leads?.name || opp.parties?.legal_name || 'Sin Asignar'}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Stage Badge */}
                                    <TableCell>
                                        <Badge className={cn("border-none px-3 py-1 font-black text-[9px] uppercase tracking-widest rounded-full shadow-sm", stage.style)}>
                                            {stage.label}
                                        </Badge>
                                    </TableCell>

                                    {/* Value */}
                                    <TableCell>
                                        <span className="text-sm font-black text-slate-900 italic tracking-tighter uppercase">
                                            ${(Number(opp.value) || 0).toLocaleString('es-CO')}
                                        </span>
                                    </TableCell>

                                    {/* Probability */}
                                    <TableCell>
                                        <div className="flex items-center gap-3 w-32">
                                            <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                                    style={{ width: `${opp.probability}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 italic">{opp.probability}%</span>
                                        </div>
                                    </TableCell>

                                    {/* Close Date */}
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Calendar className="h-3 w-3" />
                                            <span className="text-[10px] font-extrabold uppercase tracking-widest">
                                                {opp.expected_close_date ? new Date(opp.expected_close_date).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Vindiente'}
                                            </span>
                                        </div>
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell className="pr-8 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon" asChild className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-sm text-slate-300 hover:text-indigo-600 transition-all">
                                                <Link href={`/crm/opportunities/${opp.id}/edit`}>
                                                    <Edit2 className="h-4 w-4" />
                                                </Link>
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-sm text-slate-300 hover:text-slate-900 transition-all">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-2xl border-slate-100 shadow-premium p-2">
                                                    <DropdownMenuItem className="rounded-xl font-black text-[9px] uppercase tracking-widest text-slate-400 focus:text-indigo-600 focus:bg-indigo-50 cursor-pointer">
                                                        <Eye className="mr-2 h-3.5 w-3.5" /> Ver Detalle
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => onDelete?.(opp.id)}
                                                        className="rounded-xl font-black text-[9px] uppercase tracking-widest text-rose-400 focus:text-rose-600 focus:bg-rose-50 cursor-pointer"
                                                    >
                                                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
