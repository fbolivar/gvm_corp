"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Party } from "../types"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import { useDebounce } from "@/shared/hooks/useDebounce"
import {
    Search,
    User,
    Building,
    Mail,
    MoreHorizontal,
    ShieldCheck,
    Contact,
    LayoutGrid,
    List,
    Phone,
    ChevronRight,
    Plus,
    Briefcase,
    TrendingUp,
    Zap,
    Banknote,
    Clock
} from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem
} from "@/shared/components/ui/dropdown-menu"
import { PartyTable } from "./PartyTable"

interface VendorMetric {
    total_purchased: number
    reliability_score: number
    avg_lead_time_days: number
    pending_bills_amount: number
    [key: string]: unknown
}

interface PartyListProps {
    initialData: Party[]
    totalCount: number
    currentPage: number
    perPage: number
    vendorMetrics?: Record<string, VendorMetric>
}

export function PartyList({ initialData, totalCount, currentPage, perPage, vendorMetrics }: PartyListProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
    const [search, setSearch] = useState(searchParams.get('search') || '')
    const debouncedSearch = useDebounce(search, 500)

    const currentType = searchParams.get('type') || 'all'
    const currentRole = searchParams.get('role') || 'all'

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (debouncedSearch) {
            params.set('search', debouncedSearch)
        } else {
            params.delete('search')
        }
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`)
    }, [debouncedSearch])

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('page', newPage.toString())
        router.push(`${pathname}?${params.toString()}`)
    }

    const handleFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value === 'all') {
            params.delete(key)
        } else {
            params.set(key, value)
        }
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`)
    }

    const totalPages = Math.ceil(totalCount / perPage)

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex flex-col sm:flex-row gap-3 flex-1">
                    {/* Search */}
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            placeholder="Nombre, NIT, Email o Telefono..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9 rounded-xl text-xs"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 px-3 rounded-xl text-xs gap-1.5">
                                    <Briefcase className="h-3.5 w-3.5" />
                                    Tipo
                                    {currentType !== 'all' && (
                                        <Badge className="bg-indigo-100 text-indigo-600 border-none text-[10px] font-semibold h-5 px-1.5 rounded-md">
                                            {currentType === 'PERSON' ? 'NAT' : 'JUR'}
                                        </Badge>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="rounded-xl w-48">
                                <DropdownMenuLabel className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Filtrar por Tipo</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem checked={currentType === 'all'} onCheckedChange={() => handleFilterChange('type', 'all')} className="text-xs">Todos</DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem checked={currentType === 'PERSON'} onCheckedChange={() => handleFilterChange('type', 'PERSON')} className="text-xs">Persona Natural</DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem checked={currentType === 'COMPANY'} onCheckedChange={() => handleFilterChange('type', 'COMPANY')} className="text-xs">Persona Juridica</DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 px-3 rounded-xl text-xs gap-1.5">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Rol
                                    {currentRole !== 'all' && (
                                        <Badge className="bg-indigo-100 text-indigo-600 border-none text-[10px] font-semibold h-5 px-1.5 rounded-md">
                                            {currentRole === 'customer' ? 'CLI' : 'PRO'}
                                        </Badge>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="rounded-xl w-48">
                                <DropdownMenuLabel className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Rol Comercial</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem checked={currentRole === 'all'} onCheckedChange={() => handleFilterChange('role', 'all')} className="text-xs">Todos</DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem checked={currentRole === 'customer'} onCheckedChange={() => handleFilterChange('role', 'customer')} className="text-xs">Clientes</DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem checked={currentRole === 'vendor'} onCheckedChange={() => handleFilterChange('role', 'vendor')} className="text-xs">Proveedores</DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-semibold text-slate-400">{totalCount} registros</span>

                    <div className="bg-slate-100 p-1 rounded-lg flex">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewMode('grid')}
                            className={cn("h-7 w-7 rounded-md", viewMode === 'grid' ? "bg-white shadow-sm text-slate-900" : "text-slate-400")}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewMode('table')}
                            className={cn("h-7 w-7 rounded-md", viewMode === 'table' ? "bg-white shadow-sm text-slate-900" : "text-slate-400")}
                        >
                            <List className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    <Button asChild className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs gap-2">
                        <Link href="/parties/new">
                            <Plus className="h-3.5 w-3.5" /> Nuevo
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Content */}
            {viewMode === 'table' ? (
                <PartyTable data={initialData} />
            ) : (
                <div className="space-y-3">
                    {initialData.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 flex flex-col items-center justify-center gap-3 text-center">
                            <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center">
                                <Search className="h-6 w-6 text-slate-300" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Sin Coincidencias</h3>
                                <p className="text-xs text-slate-400 mt-1">Ajusta la busqueda o los filtros</p>
                            </div>
                        </div>
                    ) : (
                        initialData.map((party) => (
                            <Card key={party.id} className="rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-100 transition-colors">
                                <CardContent className="p-5">
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                        {/* Avatar + Name */}
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={cn(
                                                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                                party.party_type === 'PERSON'
                                                    ? "bg-amber-50 text-amber-600"
                                                    : "bg-indigo-50 text-indigo-600"
                                            )}>
                                                {party.party_type === 'PERSON' ? <User className="h-4 w-4" /> : <Building className="h-4 w-4" />}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-xs font-bold text-slate-900 leading-snug truncate">
                                                        {party.legal_name}
                                                    </h3>
                                                    {party.is_customer && (
                                                        <Badge className="bg-indigo-50 text-indigo-600 border-none text-[10px] font-semibold px-2 py-0.5 rounded-lg">Cliente</Badge>
                                                    )}
                                                    {party.is_vendor && (
                                                        <Badge className="bg-rose-50 text-rose-600 border-none text-[10px] font-semibold px-2 py-0.5 rounded-lg">Proveedor</Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{party.doc_type}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        {party.doc_number}{party.doc_type === 'NIT' && party.dv ? `-${party.dv}` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact info */}
                                        <div className="flex items-center gap-4 flex-wrap shrink-0">
                                            {party.email && (
                                                <div className="flex items-center gap-1.5">
                                                    <Mail className="h-3 w-3 text-slate-300" />
                                                    <span className="text-[10px] text-slate-400">{party.email}</span>
                                                </div>
                                            )}
                                            {party.phone && (
                                                <div className="flex items-center gap-1.5">
                                                    <Phone className="h-3 w-3 text-slate-300" />
                                                    <span className="text-[10px] text-slate-400 font-mono">{party.phone}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button variant="outline" size="sm" asChild className="h-8 px-3 rounded-xl text-xs gap-1.5">
                                                <Link href={`/parties/${party.id}`}>
                                                    Ver <ChevronRight className="h-3 w-3" />
                                                </Link>
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg">
                                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-xl w-48">
                                                    <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
                                                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Registro Tributario
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
                                                        <Contact className="h-3.5 w-3.5 text-indigo-500" /> Historial Cartera
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>

                                    {/* Vendor KPIs */}
                                    {party.is_vendor && party.id && vendorMetrics && vendorMetrics[party.id] && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] text-slate-400">Volumen</p>
                                                    <p className="text-xs font-bold text-slate-900 font-mono tabular-nums">
                                                        ${Number(vendorMetrics[party.id].total_purchased).toLocaleString('es-CO')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] text-slate-400">Confiabilidad</p>
                                                    <p className="text-xs font-bold text-slate-900">{vendorMetrics[party.id].reliability_score}%</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-3 w-3 text-indigo-500 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] text-slate-400">Lead Time</p>
                                                    <p className="text-xs font-bold text-slate-900">{vendorMetrics[party.id].avg_lead_time_days}d</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Banknote className="h-3 w-3 text-rose-500 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] text-slate-400">Deuda</p>
                                                    <p className="text-xs font-bold text-rose-600 font-mono tabular-nums">
                                                        ${Number(vendorMetrics[party.id].pending_bills_amount).toLocaleString('es-CO')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-[10px] font-semibold text-slate-400">
                        Pagina {currentPage} de {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="h-8 px-3 rounded-xl text-xs"
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="h-8 px-3 rounded-xl text-xs"
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
