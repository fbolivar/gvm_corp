"use client"

import { Party } from "../types"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/components/ui/table"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
    ExternalLink,
    MoreHorizontal,
    ShieldCheck,
    Contact,
    User,
    Building,
    ChevronRight,
    Zap,
    Mail,
    Phone,
    Fingerprint
} from "lucide-react"
import Link from "next/link"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { cn } from "@/shared/lib/utils"

interface PartyTableProps {
    data: Party[]
}

export function PartyTable({ data }: PartyTableProps) {
    if (data.length === 0) {
        return (
            <div className="relative group overflow-hidden text-center py-40 bg-white rounded-[4rem] shadow-premium border-none">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-100 to-transparent" />
                <div className="relative z-10">
                    <div className="h-24 w-24 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-100 mx-auto mb-8 border border-slate-50 shadow-inner">
                        <Contact className="h-12 w-12" />
                    </div>
                    <h3 className="text-slate-900 font-black text-3xl tracking-tighter italic uppercase">Archivo Inexistente</h3>
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] mt-4">No se detectaron registros bajo los parámetros de búsqueda actuales.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="relative rounded-[3.5rem] border-none bg-white shadow-premium overflow-hidden animate-in fade-in duration-1000">
            {/* Zap Decorator */}
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <Zap className="h-40 w-40 text-slate-900" />
            </div>

            <Table>
                <TableHeader className="bg-slate-50/50">
                    <TableRow className="border-slate-50 hover:bg-transparent">
                        <TableHead className="w-[100px] pl-12 py-10"></TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 py-10 italic">Identidad Corporativa</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 py-10 italic">Nivel de Alianza</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 py-10 italic">Punto de Contacto</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 py-10 pr-12 italic">Operaciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((party) => (
                        <TableRow key={party.id} className="border-slate-50 hover:bg-slate-50/80 transition-all duration-500 group">
                            <TableCell className="pl-12 py-8">
                                <div className={cn(
                                    "h-16 w-16 rounded-[1.5rem] flex items-center justify-center shadow-premium group-hover:rotate-6 group-hover:scale-110 transition-all duration-700 relative overflow-hidden",
                                    party.party_type === 'PERSON'
                                        ? 'bg-gradient-to-br from-amber-50 to-amber-100/50 text-amber-600'
                                        : 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 text-indigo-600'
                                )}>
                                    <div className="absolute inset-0 opacity-20 bg-grid-slate-200" />
                                    {party.party_type === 'PERSON' ? <User className="h-7 w-7 relative z-10" /> : <Building className="h-7 w-7 relative z-10" />}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="space-y-2">
                                    <div className="font-black text-slate-900 text-xl tracking-tighter group-hover:text-primary transition-colors duration-500 italic uppercase">
                                        {party.legal_name}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className="bg-slate-900 text-white border-none text-[9px] font-black px-2 py-0 h-5 uppercase tracking-[0.2em] rounded-md">
                                            {party.doc_type}
                                        </Badge>
                                        <div className="flex items-center gap-1">
                                            <Fingerprint className="h-3 w-3 text-slate-200" />
                                            <span className="text-xs font-black text-slate-400 tracking-[0.2em] font-mono leading-none">
                                                {party.doc_number}{party.doc_type === 'NIT' && party.dv ? <span className="text-primary tracking-tighter">·{party.dv}</span> : ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-2.5 flex-wrap">
                                    {party.is_customer && (
                                        <Badge className="bg-indigo-500/10 text-indigo-600 border-none text-[9px] font-black tracking-widest px-4 py-1.5 rounded-full shadow-sm uppercase italic">
                                            Cliente Preferente
                                        </Badge>
                                    )}
                                    {party.is_vendor && (
                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-black tracking-widest px-4 py-1.5 rounded-full shadow-sm uppercase italic">
                                            Proveedor Base
                                        </Badge>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-3.5 w-3.5 text-slate-300" />
                                        <span className="text-xs font-black text-slate-600 truncate max-w-[200px] leading-none lowercase tracking-tighter italic">
                                            {party.email || 'sin@registro.com'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-3.5 w-3.5 text-slate-300" />
                                        <span className="text-[11px] font-black text-slate-400 font-mono tracking-widest leading-none">
                                            {party.phone || '-- --- ----'}
                                        </span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-right pr-12">
                                <div className="flex justify-end gap-4">
                                    <Button variant="outline" size="icon" asChild className="h-12 w-12 rounded-2xl border-none bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white shadow-sm transition-all duration-500 hover:scale-110 active:scale-90">
                                        <Link href={`/parties/${party.id}`}>
                                            <ChevronRight className="h-6 w-6" />
                                        </Link>
                                    </Button>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl text-slate-200 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                                                <MoreHorizontal className="h-6 w-6" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-72 bg-white border-none shadow-premium rounded-[2rem] p-3 animate-in fade-in zoom-in-95 duration-300">
                                            <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 px-4 py-4 italic">Gestión de Perfil</DropdownMenuLabel>
                                            <DropdownMenuSeparator className="bg-slate-50" />
                                            <div className="p-1 space-y-1">
                                                <DropdownMenuItem className="rounded-xl focus:bg-slate-50 focus:text-primary cursor-pointer px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-4 group/item">
                                                    <ShieldCheck className="h-4 w-4 text-emerald-500 group-hover/item:scale-110 transition-transform" /> Registro Dian
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="rounded-xl focus:bg-slate-50 focus:text-primary cursor-pointer px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-4 group/item">
                                                    <Contact className="h-4 w-4 text-indigo-500 group-hover/item:scale-110 transition-transform" /> Movimientos
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-slate-50 mx-2 my-2" />
                                                <DropdownMenuItem className="rounded-xl focus:bg-rose-50 focus:text-rose-600 cursor-pointer px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 flex items-center gap-4 group/item">
                                                    <Zap className="h-4 w-4 text-rose-500 group-hover/item:rotate-12 transition-transform" /> Desactivar Registro
                                                </DropdownMenuItem>
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div >
    )
}
