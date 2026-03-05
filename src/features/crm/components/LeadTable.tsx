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

const statusConfig: Record<string, { label: string; style: string }> = {
    'NEW': { label: 'Nuevo', style: 'border-blue-200 text-blue-600 bg-blue-50' },
    'CONTACTED': { label: 'Contactado', style: 'border-amber-200 text-amber-600 bg-amber-50' },
    'QUALIFIED': { label: 'Calificado', style: 'border-indigo-200 text-indigo-600 bg-indigo-50' },
    'LOST': { label: 'Perdido', style: 'border-rose-200 text-rose-600 bg-rose-50' },
    'CONVERTED': { label: 'Convertido', style: 'border-emerald-200 text-emerald-600 bg-emerald-50' },
}

export function LeadTable({ leads, onDelete, onConvert }: LeadTableProps) {
    return (
        <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                        <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Prospecto</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Estado</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Contacto</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Empresa</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Origen</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {leads.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={6} className="py-12 text-center">
                                <div className="flex flex-col items-center gap-3 opacity-30">
                                    <Sparkles className="h-8 w-8 text-slate-300" />
                                    <p className="text-xs text-slate-400">Sin prospectos registrados</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        leads.map((lead) => {
                            const status = statusConfig[lead.status] || { label: lead.status, style: 'border-slate-200 text-slate-400 bg-slate-50' }

                            return (
                                <TableRow key={lead.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                                <User className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 truncate">{lead.name}</p>
                                                <span className="text-[10px] text-slate-400">{lead.id?.split('-')[0]}</span>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <Badge variant="outline" className={cn("border px-2 py-0.5 font-semibold text-[10px] tracking-wider rounded-full whitespace-nowrap", status.style)}>
                                            {status.label}
                                        </Badge>
                                    </TableCell>

                                    <TableCell>
                                        <div className="space-y-0.5">
                                            {lead.email && (
                                                <div className="flex items-center gap-1.5 text-slate-500">
                                                    <Mail className="h-3 w-3 shrink-0" />
                                                    <span className="text-[11px] truncate max-w-[180px]">{lead.email}</span>
                                                </div>
                                            )}
                                            {lead.phone && (
                                                <div className="flex items-center gap-1.5 text-slate-500">
                                                    <Phone className="h-3 w-3 shrink-0" />
                                                    <span className="text-[11px]">{lead.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                                            <span className="text-[11px] font-medium truncate max-w-[140px]">{lead.company_name || 'Particular'}</span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <Badge className="bg-slate-100 text-slate-600 border-none px-2 py-0.5 font-medium text-[10px] tracking-wider rounded-md">
                                            {lead.source || 'Directo'}
                                        </Badge>
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onConvert?.(lead)}
                                                disabled={lead.status === 'CONVERTED'}
                                                className="h-7 px-2.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[10px] disabled:opacity-30"
                                            >
                                                <UserCheck className="h-3.5 w-3.5 mr-1" />
                                                Convertir
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-slate-100">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-md p-1 min-w-[160px]">
                                                    <DropdownMenuItem asChild className="rounded-lg text-xs text-slate-600 cursor-pointer h-8">
                                                        <Link href={`/crm/leads/${lead.id}/edit`}>
                                                            <Edit2 className="mr-2 h-3.5 w-3.5" /> Editar
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild className="rounded-lg text-xs text-slate-600 cursor-pointer h-8">
                                                        <Link href={`/crm/leads/${lead.id}/edit`}>
                                                            <Eye className="mr-2 h-3.5 w-3.5" /> Ver detalle
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <div className="h-px bg-slate-100 my-1" />
                                                    <DropdownMenuItem
                                                        onClick={() => onDelete?.(lead.id!)}
                                                        className="rounded-lg text-xs text-rose-500 focus:text-white focus:bg-rose-500 cursor-pointer h-8"
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
