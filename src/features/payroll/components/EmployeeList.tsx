"use client"

import { useState } from "react"
import { Employee } from "../types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Button } from "@/shared/components/ui/button"
import {
    Plus,
    User,
    Calculator,
    Search,
    LayoutGrid,
    List,
    ShieldCheck,
    Clock,
    TrendingUp,
    MoreHorizontal,
    ChevronRight,
    Users,
    Mail,
    Phone,
    Calendar,
    Briefcase,
    Loader2,
    Sparkles,
    CheckCircle2,
    AlertCircle
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { payrollService } from "../services/payrollService"
import { financeService } from "../services/financeService"
import { employeeService } from "../services/employeeService"
import { accountingService } from "@/features/accounting/services/accountingService"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/shared/components/ui/dialog"
import { Progress } from "@/shared/components/ui/progress"
import Link from "next/link"
import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Input } from "@/shared/components/ui/input"
import { cn } from "@/shared/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

interface EmployeeListProps {
    employees: Employee[]
}

export function EmployeeList({ employees }: EmployeeListProps) {
    const supabase = createClient()
    const router = useRouter()
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
    const [search, setSearch] = useState('')
    const [isBulkOpen, setIsBulkOpen] = useState(false)
    const [isBulkLoading, setIsBulkLoading] = useState(false)
    const [bulkProgress, setBulkProgress] = useState(0)
    const [currentBulkName, setCurrentBulkName] = useState("")

    const filteredEmployees = employees.filter(emp =>
        emp.party?.legal_name?.toLowerCase().includes(search.toLowerCase()) ||
        emp.party?.doc_number?.includes(search)
    )

    const handleBulkGeneration = async () => {
        setIsBulkLoading(true)
        setBulkProgress(0)
        let successCount = 0

        try {
            const tenantId = await employeeService.getTenantId(supabase)

            for (let i = 0; i < filteredEmployees.length; i++) {
                const emp = filteredEmployees[i]
                setCurrentBulkName(emp.party?.legal_name || "...")

                try {
                    // 1. Fetch dependencies
                    const loans = await financeService.getEmployeeLoans(supabase, emp.id!)
                    const benefits = await financeService.getEmployeeBenefits(supabase, emp.id!)

                    // 2. Calculate
                    const settlement = payrollService.calculateSettlement(emp, 30, loans, benefits)

                    // 3. Create Document
                    const doc = await payrollService.createPayrollDocument(supabase, settlement, tenantId)

                    // 4. Accounting (Full doc required)
                    const { data: fullDoc } = await supabase
                        .from('documents')
                        .select('*, party:parties(*)')
                        .eq('id', doc.id)
                        .single();

                    await accountingService.createEntryFromPayroll(supabase, fullDoc, settlement)

                    successCount++
                } catch (e) {
                    console.error(`Error processing ${emp.party?.legal_name}:`, e)
                }

                setBulkProgress(Math.round(((i + 1) / filteredEmployees.length) * 100))
            }

            toast.success(`Nómina masiva completada: ${successCount} documentos generados y contabilizados.`)
            setTimeout(() => {
                setIsBulkOpen(false)
                setIsBulkLoading(false)
            }, 1000)
        } catch (err) {
            toast.error("Error crítico en proceso masivo")
            setIsBulkLoading(false)
        }
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header / Actions */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                <div className="flex flex-col md:flex-row gap-4 flex-1">
                    {/* Search */}
                    <div className="relative w-full md:w-[450px] group">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                        </div>
                        <Input
                            placeholder="Buscar colaborador por nombre o NIT..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-14 bg-white border-none shadow-premium rounded-[1.5rem] h-14 text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-bold placeholder:text-slate-300"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-14 rounded-[1.5rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 shadow-active transition-all hover:scale-105 active:scale-95 border-none flex items-center gap-3">
                                <Sparkles className="h-5 w-5" />
                                <span className="text-xs uppercase tracking-widest text-[10px]">Liquidación Masiva</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] border-none shadow-2xl rounded-[2.5rem] p-10 bg-slate-50">
                            <DialogHeader>
                                <DialogTitle className="text-3xl font-black text-slate-900 tracking-tighter italic">Liquidación de Periodo</DialogTitle>
                            </DialogHeader>
                            {!isBulkLoading ? (
                                <div className="space-y-6 py-6">
                                    <div className="bg-white p-6 rounded-[2rem] shadow-sm space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaboradores a Procesar</p>
                                            <Badge variant="outline" className="border-indigo-100 bg-indigo-50 text-indigo-600 font-black">{filteredEmployees.length}</Badge>
                                        </div>
                                        <p className="text-sm font-bold text-slate-600">Se generará la nómina para todos los colaboradores listados actualmente (30 días de periodo).</p>
                                    </div>
                                    <div className="bg-indigo-900 p-6 rounded-[2rem] text-white space-y-2">
                                        <div className="flex items-center gap-3">
                                            <ShieldCheck className="h-5 w-5 text-indigo-400" />
                                            <h4 className="font-black text-xs uppercase tracking-widest">Garantía Contable</h4>
                                        </div>
                                        <p className="text-[10px] text-indigo-200 font-bold italic">Cada nómina generada será contabilizada automáticamente en el libro diario siguiendo el PUC comercial.</p>
                                    </div>
                                    <Button
                                        onClick={handleBulkGeneration}
                                        className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-primary transition-all font-black text-xs uppercase tracking-widest"
                                    >
                                        Iniciar Proceso Masivo
                                    </Button>
                                </div>
                            ) : (
                                <div className="py-10 space-y-10 text-center">
                                    <div className="relative h-32 w-32 mx-auto">
                                        <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                                        <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-2xl font-black text-indigo-600">{bulkProgress}%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <h3 className="text-xl font-black text-slate-900 italic">Procesando Nóminas...</h3>
                                        <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            {currentBulkName}
                                        </div>
                                    </div>
                                    <Progress value={bulkProgress} className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-600 transition-all duration-300"
                                            style={{ width: `${bulkProgress}%` }}
                                        />
                                    </Progress>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>

                    <Button asChild className="h-14 rounded-[1.5rem] bg-slate-900 hover:bg-primary text-white font-black px-8 shadow-active transition-all hover:scale-105 active:scale-95 border-none">
                        <Link href="/payroll/employees/new" className="flex items-center gap-3">
                            <Plus className="h-5 w-5" />
                            <span className="text-xs uppercase tracking-widest text-[10px]">Contratar Personal</span>
                        </Link>
                    </Button>

                    <div className="bg-white p-1.5 rounded-[1.5rem] shadow-premium flex h-14 border-none">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "rounded-xl w-11 h-11 p-0 transition-all",
                                viewMode === 'grid' ? "bg-slate-900 text-white shadow-lg" : "text-slate-300 hover:text-slate-900"
                            )}
                        >
                            <LayoutGrid className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewMode('table')}
                            className={cn(
                                "rounded-xl w-11 h-11 p-0 transition-all",
                                viewMode === 'table' ? "bg-slate-900 text-white shadow-lg" : "text-slate-300 hover:text-slate-900"
                            )}
                        >
                            <List className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>

            {viewMode === 'table' ? (
                <Card className="border-none shadow-premium bg-white overflow-hidden rounded-[2.5rem]">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-50 hover:bg-transparent">
                                    <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] py-5 px-10">Colaborador</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] py-5">Contrato</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] py-5">Salario Base</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] py-5">Estado</TableHead>
                                    <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-[0.15em] py-5 text-right pr-10">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEmployees.length === 0 ? (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={5} className="py-24 text-center text-slate-300 italic">
                                            No se han encontrado colaboradores en este criterio.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredEmployees.map((emp) => (
                                        <TableRow key={emp.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                            <TableCell className="px-10 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm group-hover:bg-white group-hover:shadow-premium transition-all">
                                                        <User className="h-6 w-6" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">
                                                            {emp.party?.legal_name}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                                            ID: {emp.party?.doc_number}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2.5">
                                                    <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                                        <Briefcase className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{emp.contract_type}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm font-black text-slate-900 tracking-tighter">
                                                    ${emp.salary.toLocaleString('es-CO')}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn(
                                                    "border-none px-3 font-bold text-[9px] uppercase tracking-tight",
                                                    emp.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                                                )}>
                                                    {emp.status === 'ACTIVE' ? 'ACTIVO' : 'INACTIVO'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-10">
                                                <Button asChild variant="ghost" className="h-10 w-10 p-0 rounded-xl text-slate-300 hover:text-slate-900 hover:bg-white hover:shadow-premium">
                                                    <Link href={`/payroll/employees/${emp.id}`}>
                                                        <ChevronRight className="h-5 w-5" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredEmployees.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] shadow-premium">
                            <Users className="h-16 w-16 text-slate-100 mx-auto mb-6" />
                            <h3 className="text-xl font-black text-slate-900 italic">No hay resultados</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase mt-2">Prueba con otro término de búsqueda</p>
                        </div>
                    ) : (
                        filteredEmployees.map((emp) => (
                            <Card key={emp.id} className="border-none shadow-premium bg-white rounded-[2.5rem] group hover:scale-[1.02] transition-all duration-500 overflow-hidden">
                                <CardContent className="p-8 space-y-6">
                                    <div className="flex items-start justify-between">
                                        <div className="h-14 w-14 rounded-[2rem] bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                            <User className="h-10 w-10" />
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <Badge className={cn(
                                                "border-none px-3 py-1 font-black text-[9px] uppercase tracking-widest",
                                                emp.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                                            )}>
                                                {emp.status === 'ACTIVE' ? 'CONTRATO ACTIVO' : 'CESADO'}
                                            </Badge>
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                                <ShieldCheck className="h-3 w-3 text-indigo-400" />
                                                Verificado
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic group-hover:text-primary transition-colors">
                                            {emp.party?.legal_name}
                                        </h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{emp.contract_type} • DESDE 2024</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-4 rounded-3xl">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Salario Base</p>
                                            <p className="font-black text-slate-900 tracking-tighter text-lg">${emp.salary.toLocaleString('es-CO')}</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-3xl">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Identificación</p>
                                            <p className="font-black text-slate-900 tracking-tighter text-lg">{emp.party?.doc_number}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        {emp.party?.email && (
                                            <div className="flex items-center gap-3 text-slate-500 group-hover:text-slate-900 transition-colors">
                                                <Mail className="h-4 w-4" />
                                                <span className="text-[11px] font-bold tracking-tight">{emp.party.email}</span>
                                            </div>
                                        )}
                                        {emp.party?.phone && (
                                            <div className="flex items-center gap-3 text-slate-500 group-hover:text-slate-900 transition-colors">
                                                <Phone className="h-4 w-4" />
                                                <span className="text-[11px] font-bold tracking-tight">{emp.party.phone}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        <Button asChild className="flex-1 h-12 rounded-2xl bg-slate-900 hover:bg-primary text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-xl group/btn active:scale-95">
                                            <Link href={`/payroll/employees/${emp.id}`}>
                                                Editar Perfil
                                            </Link>
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-none bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors">
                                                    <MoreHorizontal className="h-5 w-5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56 bg-white border-none shadow-premium rounded-2xl p-2">
                                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">Quick Actions</DropdownMenuLabel>
                                                <DropdownMenuSeparator className="bg-slate-50" />
                                                <DropdownMenuItem asChild className="rounded-xl font-bold text-xs uppercase py-3 cursor-pointer">
                                                    <Link href="/payroll/settlement" className="flex items-center">
                                                        <Calculator className="mr-3 h-4 w-4 text-rose-500" /> Liquidar Nómina
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="rounded-xl font-bold text-xs uppercase py-3 cursor-pointer">
                                                    <Calendar className="mr-3 h-4 w-4 text-primary" /> Historial Pagos
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
