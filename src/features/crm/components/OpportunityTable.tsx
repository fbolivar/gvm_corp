"use client"

import { OpportunityStage } from "../types"
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
    Briefcase,
    Sparkles
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
    opportunities: Record<string, unknown>[]
    onDelete?: (id: string) => void
}

const stageConfig: Record<OpportunityStage, { label: string; style: string; icon: React.ComponentType<{ className?: string }> }> = {
    'PROSPECTING': { label: 'Prospección', style: 'border-slate-200 text-slate-500 bg-slate-50', icon: Target },
    'QUALIFICATION': { label: 'Calificación', style: 'border-blue-200 text-blue-600 bg-blue-50', icon: BarChart2 },
    'PROPOSAL': { label: 'Propuesta', style: 'border-amber-200 text-amber-600 bg-amber-50', icon: Briefcase },
    'NEGOTIATION': { label: 'Negociación', style: 'border-indigo-200 text-indigo-600 bg-indigo-50', icon: TrendingUp },
    'CLOSED_WON': { label: 'Ganada', style: 'border-emerald-200 text-emerald-600 bg-emerald-50', icon: DollarSign },
    'CLOSED_LOST': { label: 'Perdida', style: 'border-rose-200 text-rose-500 bg-rose-50', icon: Trash2 },
}

export function OpportunityTable({ opportunities, onDelete }: OpportunityTableProps) {
    return (
        <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                        <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Oportunidad</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Etapa</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Valor</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Probabilidad</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Cierre</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {opportunities.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={6} className="py-12 text-center">
                                <div className="flex flex-col items-center gap-3 opacity-30">
                                    <Sparkles className="h-8 w-8 text-slate-300" />
                                    <p className="text-xs text-slate-400">Sin oportunidades activas</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        opportunities.map((opp) => {
                            const stage = stageConfig[opp.stage as OpportunityStage] || stageConfig.PROSPECTING;
                            const StageIcon = stage.icon;
                            const leads = opp.leads as Record<string, unknown> | null;
                            const parties = opp.parties as Record<string, unknown> | null;

                            return (
                                <TableRow key={String(opp.id)} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", stage.style)}>
                                                <StageIcon className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 truncate">{String(opp.name)}</p>
                                                <span className="text-[10px] text-slate-400">
                                                    {String(leads?.name || parties?.legal_name || 'Sin asignar')}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <Badge variant="outline" className={cn("border px-2 py-0.5 font-semibold text-[10px] tracking-wider rounded-full whitespace-nowrap", stage.style)}>
                                            {stage.label}
                                        </Badge>
                                    </TableCell>

                                    <TableCell>
                                        <span className="text-sm font-bold text-slate-900">
                                            ${(Number(opp.value) || 0).toLocaleString('es-CO')}
                                        </span>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-2 w-24">
                                            <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-500 rounded-full"
                                                    style={{ width: `${Number(opp.probability) || 0}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-medium text-slate-400">{String(opp.probability)}%</span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                            <Calendar className="h-3 w-3 shrink-0" />
                                            <span className="text-[11px]">
                                                {opp.expected_close_date
                                                    ? new Date(String(opp.expected_close_date)).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', year: 'numeric' })
                                                    : 'Pendiente'}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-slate-100">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-md p-1 min-w-[160px]">
                                                <DropdownMenuItem asChild className="rounded-lg text-xs text-slate-600 cursor-pointer h-8">
                                                    <Link href={`/crm/opportunities/${opp.id}/edit`}>
                                                        <Edit2 className="mr-2 h-3.5 w-3.5" /> Editar
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild className="rounded-lg text-xs text-slate-600 cursor-pointer h-8">
                                                    <Link href={`/crm/opportunities/${opp.id}`}>
                                                        <Eye className="mr-2 h-3.5 w-3.5" /> Ver detalle
                                                    </Link>
                                                </DropdownMenuItem>
                                                <div className="h-px bg-slate-100 my-1" />
                                                <DropdownMenuItem
                                                    onClick={() => onDelete?.(String(opp.id))}
                                                    className="rounded-lg text-xs text-rose-500 focus:text-white focus:bg-rose-500 cursor-pointer h-8"
                                                >
                                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
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
