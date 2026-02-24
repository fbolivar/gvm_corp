"use client"

import { Lead } from "../types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
    Edit2,
    Trash2,
    User,
    Mail,
    Phone,
    Building2,
    UserCheck,
    MoreHorizontal,
    Eye,
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

interface LeadTableProps {
    leads: Lead[]
    onDelete?: (id: string) => void
    onConvert?: (lead: Lead) => void
}

const statusConfig: Record<string, { label: string; style: string; color: string }> = {
    'NEW': { label: 'RADICADO NUEVO', style: 'border-blue-200 text-blue-600 bg-blue-50/50', color: '#3b82f6' },
    'CONTACTED': { label: 'EN GESTIÓN', style: 'border-amber-200 text-amber-600 bg-amber-50/50', color: '#f59e0b' },
    'QUALIFIED': { label: 'CERTIFICADO', style: 'border-indigo-200 text-indigo-600 bg-indigo-50/50', color: '#6366f1' },
    'LOST': { label: 'DESCARTADO', style: 'border-rose-200 text-rose-600 bg-rose-50/50', color: '#f43f5e' },
    'CONVERTED': { label: 'CONVERTIDO CLIENTE', style: 'border-emerald-200 text-emerald-600 bg-emerald-50/50', color: '#10b981' },
}

export function LeadTable({ leads, onDelete, onConvert }: LeadTableProps) {
    return (
        <div className="bg-white rounded-[3.5rem] shadow-premium overflow-hidden border border-slate-50 relative">
            <div className="absolute top-0 right-0 p-12 opacity-[0.01] pointer-events-none">
                <UserCheck className="h-64 w-64" />
            </div>

            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-50 h-20">
                        <TableHead className="pl-14 text-[10px] font-black uppercase text-slate-400 tracking-[0.4em] italic">
                            <div className="flex items-center gap-4">
                                <div className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]" />
                                PROSPECTO / ENTIDAD
                            </div>
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em] italic">ESTADO GESTIÓN</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em] italic">CANAL CONTACTO</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em] italic text-center">CORPORATIVO</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em] italic">ORIGEN DATA</TableHead>
                        <TableHead className="pr-14 text-right text-[10px] font-black uppercase text-slate-400 tracking-[0.4em] italic">OPERATIVA</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {leads.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={6} className="py-40 text-center">
                                <div className="flex flex-col items-center gap-8 opacity-20">
                                    <Sparkles className="h-20 w-20 text-slate-300" />
                                    <p className="text-sm font-black uppercase tracking-[0.5em] italic">CERO REGISTROS EN RADAR</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        leads.map((lead) => {
                            const status = statusConfig[lead.status] || { label: lead.status, style: 'border-slate-100 text-slate-400 bg-slate-50', color: '#94a3b8' }

                            return (
                                <TableRow key={lead.id} className="group hover:bg-slate-50/50 transition-all border-slate-50 h-24">
                                    {/* Name & Account */}
                                    <TableCell className="pl-14">
                                        <div className="flex items-center gap-6">
                                            <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-950 group-hover:text-white group-hover:rotate-12 transition-all duration-500 shadow-inner">
                                                <User className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-950 italic tracking-tighter uppercase leading-none mb-1.5 group-hover:text-indigo-600 transition-colors text-base">
                                                    {lead.name}
                                                </p>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">REG_ID: </span>
                                                    <Badge variant="outline" className="text-[8px] font-bold border-slate-100 text-slate-400 bg-slate-50 tracking-widest px-2 py-0">
                                                        {lead.id?.split('-')[0]}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Status Badge */}
                                    <TableCell>
                                        <Badge variant="outline" className={cn("border-[1.5px] px-5 py-2 font-black text-[9px] uppercase tracking-[0.3em] flex items-center gap-3 rounded-full shadow-active italic leading-none whitespace-nowrap", status.style)}>
                                            <div className="h-2 w-2 rounded-full bg-current animate-pulse shadow-[0_0_8px_currentColor]" />
                                            {status.label}
                                        </Badge>
                                    </TableCell>

                                    {/* Contact */}
                                    <TableCell>
                                        <div className="space-y-2">
                                            {lead.email && (
                                                <div className="flex items-center gap-3 text-slate-400 group-hover:text-slate-600 transition-colors">
                                                    <Mail className="h-3.5 w-3.5" />
                                                    <span className="text-[10px] font-bold lowercase tracking-tight italic">{lead.email}</span>
                                                </div>
                                            )}
                                            {lead.phone && (
                                                <div className="flex items-center gap-3 text-slate-400 group-hover:text-slate-600 transition-colors">
                                                    <Phone className="h-3.5 w-3.5" />
                                                    <span className="text-[10px] font-bold tracking-tight italic">{lead.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Company */}
                                    <TableCell className="text-center">
                                        <div className="inline-flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 group-hover:bg-white transition-colors">
                                            <Building2 className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                            <span className="text-[10px] font-black uppercase tracking-widest leading-none text-slate-600 italic">
                                                {lead.company_name || 'Particular'}
                                            </span>
                                        </div>
                                    </TableCell>

                                    {/* Source */}
                                    <TableCell>
                                        <Badge variant="outline" className="bg-slate-950 text-indigo-400 border-none px-4 py-1.5 font-black text-[9px] uppercase tracking-[0.2em] italic rounded-lg shadow-active">
                                            {lead.source || 'DIRECTO'}
                                        </Badge>
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell className="pr-14 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onConvert?.(lead)}
                                                disabled={lead.status === 'CONVERTED'}
                                                className="h-12 px-6 rounded-2xl bg-slate-950 hover:bg-emerald-600 text-white font-black text-[9px] uppercase tracking-[0.3em] shadow-active transition-all active:scale-95 disabled:opacity-30 italic group/conv"
                                            >
                                                <UserCheck className="h-4 w-4 mr-3 text-emerald-400 group-hover/conv:scale-110 transition-transform" />
                                                CONVERTIR
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-slate-100 bg-white hover:bg-slate-950 hover:text-white hover:border-slate-950 transition-all shadow-premium">
                                                        <MoreHorizontal className="h-5 w-5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-[2rem] border-slate-100 shadow-premium p-3 min-w-[200px] animate-in slide-in-from-top-4 duration-500">
                                                    <DropdownMenuItem asChild className="rounded-xl font-black text-[10px] uppercase tracking-[0.3em] text-slate-400 focus:text-indigo-600 focus:bg-indigo-50 cursor-pointer h-12 italic">
                                                        <Link href={`/crm/leads/${lead.id}/edit`}>
                                                            <Edit2 className="mr-3 h-4 w-4" /> Editar Registro
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="rounded-xl font-black text-[10px] uppercase tracking-[0.3em] text-slate-400 focus:text-indigo-600 focus:bg-indigo-50 cursor-pointer h-12 italic">
                                                        <Eye className="mr-3 h-4 w-4" /> Radar de Historial
                                                    </DropdownMenuItem>
                                                    <div className="h-px bg-slate-50 my-2 mx-2" />
                                                    <DropdownMenuItem
                                                        onClick={() => onDelete?.(lead.id!)}
                                                        className="rounded-xl font-black text-[10px] uppercase tracking-[0.3em] text-rose-400 focus:text-white focus:bg-rose-500 cursor-pointer h-12 italic"
                                                    >
                                                        <Trash2 className="mr-3 h-4 w-4" /> Purgar Lead
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
