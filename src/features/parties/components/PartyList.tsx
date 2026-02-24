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
    FileText,
    MoreHorizontal,
    ExternalLink,
    ShieldCheck,
    Contact,
    LayoutGrid,
    List,
    Filter,
    Phone,
    ChevronRight,
    Plus,
    Users,
    Sparkles,
    Briefcase,
    Globe,
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

interface PartyListProps {
    initialData: Party[]
    totalCount: number
    currentPage: number
    perPage: number
    vendorMetrics?: Record<string, any>
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
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
            {/* Header de Alto Impacto */}
            <div className="relative group overflow-hidden rounded-[3.5rem] bg-slate-900 p-12 lg:p-16 shadow-2xl">
                <Sparkles className="absolute -right-20 -top-20 h-80 w-80 text-white/5 animate-pulse" />
                <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Users className="h-40 w-40 text-white" />
                </div>

                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-1 space-x-1 bg-primary rounded-full" />
                        <span className="text-primary font-black uppercase tracking-[0.4em] text-[10px]">Ecosistema Logístico</span>
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-black text-white italic tracking-tighter leading-none">
                        Directorio de <span className="text-slate-500">Terceros</span>
                    </h1>
                    <p className="text-slate-400 font-bold max-w-2xl text-sm lg:text-base leading-relaxed">
                        Administre la red de identidades comerciales. Sincronización en tiempo real con carteras, inventarios y registros legales.
                    </p>

                    <div className="flex flex-wrap items-center gap-6 pt-6">
                        <Badge className="bg-white/5 text-white border-white/10 px-4 py-1.5 font-black text-[10px] uppercase tracking-widest backdrop-blur-md">
                            {totalCount} Registros Detectados
                        </Badge>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-4 py-1.5 font-black text-[10px] uppercase tracking-widest backdrop-blur-md">
                            DIAN Sincronizado
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Area de Control y Filtros */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 sticky top-4 z-40 bg-slate-50/80 backdrop-blur-xl p-4 rounded-[2.5rem] border border-white shadow-premium">
                <div className="flex flex-col md:flex-row gap-4 flex-1">
                    {/* Buscador Industrial */}
                    <div className="relative w-full md:w-[500px] group">
                        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-300 group-focus-within:text-primary transition-all duration-300" />
                        </div>
                        <Input
                            placeholder="Nombre, NIT, Email o Teléfono..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-16 bg-white border-none shadow-sm rounded-2xl h-16 text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-black italic tracking-tighter text-lg placeholder:text-slate-200"
                        />
                    </div>

                    {/* Filtros Premium */}
                    <div className="flex gap-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-16 rounded-2xl border-none bg-white shadow-sm px-8 text-slate-500 font-black hover:bg-slate-50 transition-all group/btn">
                                    <Briefcase className="mr-3 h-5 w-5 text-primary group-hover/btn:scale-110 transition-transform" />
                                    <span className="text-[10px] uppercase tracking-widest pr-2">Naturaleza</span>
                                    {currentType !== 'all' && <Badge className="bg-primary text-white text-[9px] border-none font-black h-5 px-2 rounded-lg">{currentType === 'PERSON' ? 'NAT' : 'JUR'}</Badge>}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-white border-none shadow-2xl rounded-2xl p-2 w-64 animate-in zoom-in-95 duration-200">
                                <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] px-4 py-3">Filtrar por Tipo</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-slate-50" />
                                <DropdownMenuCheckboxItem checked={currentType === 'all'} onCheckedChange={() => handleFilterChange('type', 'all')} className="rounded-xl font-black text-[10px] uppercase py-3 cursor-pointer tracking-widest italic">Mostrar Todos</DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem checked={currentType === 'PERSON'} onCheckedChange={() => handleFilterChange('type', 'PERSON')} className="rounded-xl font-black text-[10px] uppercase py-3 cursor-pointer tracking-widest italic">Persona Natural</DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem checked={currentType === 'COMPANY'} onCheckedChange={() => handleFilterChange('type', 'COMPANY')} className="rounded-xl font-black text-[10px] uppercase py-3 cursor-pointer tracking-widest italic">Persona Jurídica</DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-16 rounded-2xl border-none bg-white shadow-sm px-8 text-slate-500 font-black hover:bg-slate-50 transition-all group/btn">
                                    <ShieldCheck className="mr-3 h-5 w-5 text-primary group-hover/btn:scale-110 transition-transform" />
                                    <span className="text-[10px] uppercase tracking-widest pr-2">Relación</span>
                                    {currentRole !== 'all' && <Badge className="bg-primary text-white text-[9px] border-none font-black h-5 px-2 rounded-lg">{currentRole === 'customer' ? 'CLI' : 'PRO'}</Badge>}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-white border-none shadow-2xl rounded-2xl p-2 w-64 animate-in zoom-in-95 duration-200">
                                <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] px-4 py-3">Rol Comercial</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-slate-50" />
                                <DropdownMenuCheckboxItem checked={currentRole === 'all'} onCheckedChange={() => handleFilterChange('role', 'all')} className="rounded-xl font-black text-[10px] uppercase py-3 cursor-pointer tracking-widest italic">Todos los Roles</DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem checked={currentRole === 'customer'} onCheckedChange={() => handleFilterChange('role', 'customer')} className="rounded-xl font-black text-[10px] uppercase py-3 cursor-pointer tracking-widest italic">Clientes Activos</DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem checked={currentRole === 'vendor'} onCheckedChange={() => handleFilterChange('role', 'vendor')} className="rounded-xl font-black text-[10px] uppercase py-3 cursor-pointer tracking-widest italic">Proveedores Oficiales</DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-slate-50 p-1.5 rounded-2xl flex h-16 border border-slate-100/50">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "rounded-xl w-14 h-13 p-0 transition-all duration-500",
                                viewMode === 'grid' ? "bg-white text-primary shadow-premium" : "text-slate-300 hover:text-slate-900"
                            )}
                        >
                            <LayoutGrid className="h-6 w-6" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewMode('table')}
                            className={cn(
                                "rounded-xl w-14 h-13 p-0 transition-all duration-500",
                                viewMode === 'table' ? "bg-white text-primary shadow-premium" : "text-slate-300 hover:text-slate-900"
                            )}
                        >
                            <List className="h-6 w-6" />
                        </Button>
                    </div>

                    <Button asChild className="h-16 rounded-[1.5rem] bg-slate-900 border-none hover:bg-primary text-white font-black px-10 shadow-active transition-all hover:scale-[1.05] active:scale-95 group/add">
                        <Link href="/parties/new" className="flex items-center gap-4">
                            <Plus className="h-6 w-6 group-hover/add:rotate-90 transition-transform duration-500" />
                            <span className="text-xs uppercase tracking-[0.2em]">Nuevo Registro</span>
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Listado de Contenido */}
            {viewMode === 'table' ? (
                <PartyTable data={initialData} />
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {initialData.length === 0 ? (
                        <Card className="bg-white border-none shadow-premium py-40 text-center rounded-[4rem]">
                            <div className="relative inline-block">
                                <div className="absolute inset-0 bg-slate-100 rounded-full animate-ping opacity-25" />
                                <div className="relative h-32 w-32 rounded-[2.5rem] bg-slate-50 flex items-center justify-center text-slate-200 mx-auto mb-10 border-4 border-white shadow-xl">
                                    <Search className="h-14 w-14" />
                                </div>
                            </div>
                            <h3 className="text-slate-900 font-black text-4xl tracking-tighter italic uppercase">Cero Coincidencias</h3>
                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] mt-4 underline decoration-slate-100 underline-offset-8 decoration-4">Refina el campo de búsqueda o ajusta filtros maestros</p>
                        </Card>
                    ) : (
                        initialData.map((party) => (
                            <Card key={party.id} className="bg-white border-none shadow-premium rounded-[3rem] hover:ring-2 hover:ring-primary/10 transition-all duration-500 group overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="flex flex-col lg:flex-row lg:items-center relative">
                                        <div className="absolute right-0 top-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                            {party.party_type === 'PERSON' ? <User className="h-32 w-32" /> : <Building className="h-32 w-32" />}
                                        </div>

                                        {/* Avatar Tech */}
                                        <div className="h-full lg:w-48 p-10 flex flex-col items-center justify-center gap-4 bg-slate-50 group-hover:bg-white transition-colors duration-500 relative overflow-hidden">
                                            <div className={cn(
                                                "h-24 w-24 rounded-[2rem] flex items-center justify-center transition-all duration-700 shadow-premium relative z-10 group-hover:rotate-6 group-hover:scale-110",
                                                party.party_type === 'PERSON'
                                                    ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white"
                                                    : "bg-gradient-to-br from-indigo-500 to-indigo-700 text-white"
                                            )}>
                                                {party.party_type === 'PERSON' ? <User className="h-10 w-10" /> : <Building className="h-10 w-10" />}
                                            </div>
                                            <div className="flex flex-col items-center space-y-1 z-10">
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.3em]">Naturaleza</span>
                                                <span className="text-[10px] font-black text-slate-900 uppercase italic">
                                                    {party.party_type === 'PERSON' ? 'Natural' : 'Entidad'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Core Data Area */}
                                        <div className="flex-1 p-10 lg:p-12 lg:pr-16 grid grid-cols-1 xl:grid-cols-12 gap-10 items-center">
                                            <div className="xl:col-span-8 space-y-6">
                                                <div className="space-y-2">
                                                    <div className="flex flex-wrap items-center gap-4">
                                                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter group-hover:text-primary transition-all duration-500 leading-none italic uppercase">
                                                            {party.legal_name}
                                                        </h3>
                                                        <div className="flex gap-2">
                                                            {party.is_customer && <Badge className="bg-indigo-50 text-indigo-600 border-none font-black text-[9px] px-3 py-1 rounded-full uppercase tracking-widest">CLIENTE</Badge>}
                                                            {party.is_vendor && <Badge className="bg-rose-50 text-rose-600 border-none font-black text-[9px] px-3 py-1 rounded-full uppercase tracking-widest">PROVEEDOR</Badge>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <Badge variant="outline" className="bg-slate-900 text-white border-none font-black text-[9px] px-3 py-0.5 h-5 rounded-md tracking-[0.2em]">
                                                            {party.doc_type}
                                                        </Badge>
                                                        <span className="text-sm font-black text-slate-400 tracking-[0.2em] font-mono leading-none">
                                                            {party.doc_number}{party.doc_type === 'NIT' && party.dv ? <span className="text-primary italic">·{party.dv}</span> : ''}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-8 pt-4 border-t border-slate-50">
                                                    {party.email && (
                                                        <div className="flex items-center gap-4 group/info">
                                                            <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover/info:bg-primary/10 group-hover/info:text-primary transition-all"><Mail className="h-5 w-5" /></div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Enlace Digital</span>
                                                                <span className="text-xs font-black text-slate-600 group-hover/info:text-slate-900 transition-colors">{party.email}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {party.phone && (
                                                        <div className="flex items-center gap-4 group/info">
                                                            <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover/info:bg-primary/10 group-hover/info:text-primary transition-all"><Phone className="h-5 w-5" /></div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Línea Directa</span>
                                                                <span className="text-xs font-black text-slate-600 font-mono italic">{party.phone}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-4 group/info">
                                                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover/info:bg-primary/10 group-hover/info:text-primary transition-all"><Globe className="h-5 w-5" /></div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Ubicación</span>
                                                            <span className="text-xs font-black text-slate-600 uppercase tracking-tighter">Latam Standard</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 📊 VENDOR KPI OVERLAY (Premium Light Industrial) */}
                                                {party.is_vendor && party.id && vendorMetrics && vendorMetrics[party.id] && (
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 shadow-inner group-hover:bg-white transition-all duration-700">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Volumen Compra</span>
                                                            <div className="flex items-center gap-2">
                                                                <TrendingUp className="h-3 w-3 text-emerald-500" />
                                                                <span className="text-sm font-black text-slate-900 font-mono tracking-tighter">
                                                                    ${Number(vendorMetrics[party.id].total_purchased).toLocaleString('es-CO')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Confiabilidad</span>
                                                            <div className="flex items-center gap-2">
                                                                <Zap className="h-3 w-3 text-amber-500" />
                                                                <span className="text-sm font-black text-slate-900">
                                                                    {vendorMetrics[party.id].reliability_score}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Lead Time Avg</span>
                                                            <div className="flex items-center gap-2">
                                                                <Clock className="h-3 w-3 text-indigo-500" />
                                                                <span className="text-sm font-black text-slate-900">
                                                                    {vendorMetrics[party.id].avg_lead_time_days}d
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Deuda Pendiente</span>
                                                            <div className="flex items-center gap-2">
                                                                <Banknote className="h-3 w-3 text-rose-500" />
                                                                <span className="text-sm font-black text-rose-600 font-mono tracking-tighter">
                                                                    ${Number(vendorMetrics[party.id].pending_bills_amount).toLocaleString('es-CO')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="xl:col-span-4 flex items-center justify-end gap-6 h-full lg:border-l border-slate-50 lg:pl-10">
                                                <Button asChild className="h-16 rounded-[1.5rem] bg-slate-900 hover:bg-primary text-white font-black px-10 shadow-active transition-all hover:scale-110 active:scale-95 group/btn relative overflow-hidden">
                                                    <Link href={`/parties/${party.id}`} className="flex items-center gap-3 relative z-10">
                                                        <span className="text-[10px] uppercase tracking-[0.2em]">Expediente</span>
                                                        <ChevronRight className="h-5 w-5 group-hover/btn:translate-x-2 transition-transform duration-500" />
                                                    </Link>
                                                </Button>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl text-slate-200 hover:text-slate-900 hover:bg-slate-50 transition-all">
                                                            <MoreHorizontal className="h-6 w-6" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-72 bg-white border-none shadow-2xl rounded-3xl p-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 px-4 py-4">Centro de Gestión Rapida</DropdownMenuLabel>
                                                        <DropdownMenuSeparator className="bg-slate-50" />
                                                        <div className="space-y-1 p-1">
                                                            <DropdownMenuItem className="rounded-2xl font-black text-[10px] uppercase py-4 px-4 cursor-pointer tracking-widest flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                                                <ShieldCheck className="h-4 w-4 text-emerald-500" /> Registro Tributario
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="rounded-2xl font-black text-[10px] uppercase py-4 px-4 cursor-pointer tracking-widest flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                                                <Contact className="h-4 w-4 text-primary" /> Historial de Cartera
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="rounded-2xl font-black text-[10px] uppercase py-4 px-4 cursor-pointer tracking-widest flex items-center gap-4 hover:bg-rose-50 hover:text-rose-600 text-rose-400 transition-colors">
                                                                <Plus className="h-4 w-4 rotate-45" /> Archivar Entidad
                                                            </DropdownMenuItem>
                                                        </div>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {/* Paginación Industrial */}
            {totalPages > 1 && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 px-8 pt-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                        Índice <span className="text-slate-900 font-mono tracking-tighter text-sm">P{currentPage}</span> de <span className="text-slate-900 font-mono tracking-tighter text-sm">T{totalPages}</span>
                    </p>
                    <div className="flex items-center gap-4 bg-white p-2 rounded-[2rem] shadow-premium border border-white">
                        <Button
                            variant="ghost"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="h-14 rounded-2xl px-10 font-black uppercase text-[10px] tracking-[0.3em] text-slate-400 hover:text-primary transition-all disabled:opacity-20 hover:bg-slate-50"
                        >
                            Anterior
                        </Button>
                        <div className="h-10 w-px bg-slate-100" />
                        <Button
                            variant="ghost"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="h-14 rounded-2xl px-10 font-black uppercase text-[10px] tracking-[0.3em] text-slate-400 hover:text-primary transition-all disabled:opacity-20 hover:bg-slate-50"
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
