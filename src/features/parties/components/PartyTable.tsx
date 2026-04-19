"use client"

import { useRouter } from "next/navigation"
import { Party } from "../types"
import {
    User,
    Building,
    Mail,
    Phone,
    Fingerprint,
    ShieldCheck,
    Contact,
    Zap,
    ChevronRight,
    MoreHorizontal,
} from "lucide-react"
import Link from "next/link"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { cn } from "@/shared/lib/utils"
import { DataTable, DataTableColumn } from "@/shared/components/ui/data-table"
import { StatusBadge } from "@/shared/components/ui/status-badge"

interface PartyTableProps {
    data: Party[]
}

// Derive role badge(s) from party flags
function RoleBadges({ party }: { party: Party }) {
    return (
        <div className="flex gap-2 flex-wrap">
            {party.is_customer && (
                <StatusBadge tone="info" className="text-[9px] font-black tracking-widest px-3 py-1 rounded-full uppercase italic">
                    Cliente
                </StatusBadge>
            )}
            {party.is_vendor && (
                <StatusBadge tone="success" className="text-[9px] font-black tracking-widest px-3 py-1 rounded-full uppercase italic">
                    Proveedor
                </StatusBadge>
            )}
            {!party.is_customer && !party.is_vendor && (
                <StatusBadge tone="neutral" className="text-[9px] font-black tracking-widest px-3 py-1 rounded-full uppercase italic">
                    Sin rol
                </StatusBadge>
            )}
        </div>
    )
}

export function PartyTable({ data }: PartyTableProps) {
    const router = useRouter()

    const columns: DataTableColumn<Party>[] = [
        {
            key: "avatar",
            header: "",
            width: "72px",
            accessor: (row) => (
                <div
                    className={cn(
                        "h-12 w-12 rounded-[1.25rem] flex items-center justify-center shadow-sm transition-all duration-300 relative overflow-hidden",
                        row.party_type === "PERSON"
                            ? "bg-gradient-to-br from-amber-50 to-amber-100/50 text-amber-600"
                            : "bg-gradient-to-br from-indigo-50 to-indigo-100/50 text-indigo-600"
                    )}
                >
                    {row.party_type === "PERSON"
                        ? <User className="h-5 w-5 relative z-10" />
                        : <Building className="h-5 w-5 relative z-10" />
                    }
                </div>
            ),
        },
        {
            key: "identity",
            header: "Identidad corporativa",
            sortValue: (row) => row.legal_name,
            accessor: (row) => (
                <div className="space-y-1.5">
                    <div className="font-black text-slate-900 text-base tracking-tight uppercase leading-snug">
                        {row.legal_name}
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge
                            variant="outline"
                            className="bg-slate-900 text-white border-none text-[9px] font-black px-2 py-0 h-5 uppercase tracking-[0.2em] rounded-md"
                        >
                            {row.doc_type}
                        </Badge>
                        <div className="flex items-center gap-1">
                            <Fingerprint className="h-3 w-3 text-slate-300" />
                            <span className="text-xs font-black text-slate-400 tracking-[0.15em] font-mono leading-none">
                                {row.doc_number}
                                {row.doc_type === "NIT" && row.dv
                                    ? <span className="text-primary tracking-tighter">·{row.dv}</span>
                                    : ""}
                            </span>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: "role",
            header: "Nivel de alianza",
            width: "200px",
            accessor: (row) => <RoleBadges party={row} />,
        },
        {
            key: "contact",
            header: "Punto de contacto",
            sortValue: (row) => row.city ?? "",
            accessor: (row) => (
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-300" />
                        <span className="text-xs font-black text-slate-600 truncate max-w-[200px] leading-none lowercase tracking-tighter italic">
                            {row.email || "sin@registro.com"}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-300" />
                        <span className="text-[11px] font-black text-slate-400 font-mono tracking-widest leading-none">
                            {row.phone || "-- --- ----"}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: "city",
            header: "Ciudad",
            width: "120px",
            sortValue: (row) => row.city ?? "",
            accessor: (row) => (
                <span className="text-xs font-medium text-slate-500">
                    {row.city ?? "—"}
                </span>
            ),
        },
        {
            key: "created_at",
            header: "Creación",
            width: "130px",
            sortValue: (row) => (row.created_at ? new Date(row.created_at) : null),
            accessor: (row) => (
                <span className="text-xs font-medium text-slate-400">
                    {row.created_at
                        ? new Date(row.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                </span>
            ),
        },
        {
            key: "actions",
            header: "Operaciones",
            align: "right",
            width: "120px",
            accessor: (row) => (
                <div
                    className="flex justify-end gap-3"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Button
                        variant="outline"
                        size="icon"
                        asChild
                        className="h-10 w-10 rounded-xl border-none bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white shadow-sm transition-all duration-300"
                    >
                        <Link href={`/parties/${row.id}`}>
                            <ChevronRight className="h-5 w-5" />
                        </Link>
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-xl text-slate-300 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                            >
                                <MoreHorizontal className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-64 bg-white border-none shadow-premium rounded-2xl p-3 animate-in fade-in zoom-in-95 duration-200"
                        >
                            <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 px-3 py-3 italic">
                                Gestión de Perfil
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-slate-50" />
                            <div className="p-1 space-y-1">
                                <DropdownMenuItem className="rounded-xl focus:bg-slate-50 focus:text-primary cursor-pointer px-3 py-3 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
                                    <ShieldCheck className="h-4 w-4 text-emerald-500" /> Registro Dian
                                </DropdownMenuItem>
                                <DropdownMenuItem className="rounded-xl focus:bg-slate-50 focus:text-primary cursor-pointer px-3 py-3 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
                                    <Contact className="h-4 w-4 text-indigo-500" /> Movimientos
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-slate-50 mx-2 my-2" />
                                <DropdownMenuItem className="rounded-xl focus:bg-rose-50 focus:text-rose-600 cursor-pointer px-3 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 flex items-center gap-3">
                                    <Zap className="h-4 w-4 text-rose-500" /> Desactivar Registro
                                </DropdownMenuItem>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
        },
    ]

    return (
        <DataTable<Party>
            data={data}
            columns={columns}
            rowKey={(row) => row.id ?? Math.random().toString()}
            onRowClick={(row) => router.push(`/parties/${row.id}`)}
            empty={{
                icon: Contact,
                title: "Archivo Inexistente",
                description: "No se detectaron registros bajo los parámetros de búsqueda actuales.",
            }}
            className="border-none shadow-premium rounded-[2.5rem]"
        />
    )
}
