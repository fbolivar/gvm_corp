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
    Clock,
    MoreHorizontal,
    ChevronRight,
    Users,
    Mail,
    Phone,
    Calendar,
    Briefcase,
    Loader2,
    LinkIcon,
    UserX,
} from "lucide-react"
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { LinkUserModal } from "./LinkUserModal"
import { deactivateEmployeeAction } from "../actions"
import { useRouter } from "next/navigation"

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
    const [linkModalEmployee, setLinkModalEmployee] = useState<Employee | null>(null)

    const handleDeactivateEmployee = async (emp: Employee) => {
        const name = emp.party?.legal_name || 'este empleado'
        if (!confirm(`¿Estás seguro de que deseas desactivar a ${name}? Se desvinculará su cuenta de usuario.`)) return
        const result = await deactivateEmployeeAction(emp.id!)
        if (result.success) {
            toast.success(`${name} fue desactivado exitosamente`)
            router.refresh()
        } else {
            toast.error(result.error)
        }
    }

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
                    const loans = await financeService.getEmployeeLoans(supabase, emp.id!)
                    const benefits = await financeService.getEmployeeBenefits(supabase, emp.id!)
                    const settlement = payrollService.calculateSettlement(emp, 30, loans, benefits)
                    const doc = await payrollService.createPayrollDocument(supabase, settlement, tenantId)

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

            toast.success(`Nomina masiva completada: ${successCount} documentos generados y contabilizados.`)
            setTimeout(() => {
                setIsBulkOpen(false)
                setIsBulkLoading(false)
            }, 1000)
        } catch (err) {
            toast.error("Error critico en proceso masivo")
            setIsBulkLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <Input
                        placeholder="Buscar por nombre o NIT..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9 rounded-xl text-xs bg-white border border-slate-200"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl text-xs">
                                <Clock className="h-3.5 w-3.5 mr-2" />
                                Liquidacion Masiva
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[440px] rounded-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-base font-bold">Liquidacion de Periodo</DialogTitle>
                            </DialogHeader>
                            {!isBulkLoading ? (
                                <div className="space-y-4 pt-2">
                                    <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-slate-500">Colaboradores a procesar</p>
                                            <Badge variant="outline" className="text-xs">{filteredEmployees.length}</Badge>
                                        </div>
                                        <p className="text-xs text-slate-600">Se generara la nomina para todos los colaboradores listados (30 dias de periodo).</p>
                                    </div>
                                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                                        <p className="text-xs font-semibold text-indigo-900">Garantia Contable</p>
                                        <p className="text-xs text-indigo-600/80 mt-0.5">Cada nomina sera contabilizada automaticamente en el libro diario.</p>
                                    </div>
                                    <Button
                                        onClick={handleBulkGeneration}
                                        className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs"
                                    >
                                        Iniciar Proceso Masivo
                                    </Button>
                                </div>
                            ) : (
                                <div className="py-8 space-y-6 text-center">
                                    <div className="relative h-20 w-20 mx-auto">
                                        <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
                                        <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-sm font-bold text-indigo-600">{bulkProgress}%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-bold text-slate-900">Procesando Nominas...</h3>
                                        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            {currentBulkName}
                                        </div>
                                    </div>
                                    <Progress value={bulkProgress} className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-600 transition-all duration-300"
                                            style={{ width: `${bulkProgress}%` }}
                                        />
                                    </Progress>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>

                    <Button asChild size="sm" className="h-9 px-4 rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs">
                        <Link href="/payroll/employees/new">
                            <Plus className="h-3.5 w-3.5" />
                            Contratar Personal
                        </Link>
                    </Button>

                    <div className="bg-white p-1 rounded-xl border border-slate-200 flex">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "rounded-lg h-7 w-7",
                                viewMode === 'grid' ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-900"
                            )}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewMode('table')}
                            className={cn(
                                "rounded-lg h-7 w-7",
                                viewMode === 'table' ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-900"
                            )}
                        >
                            <List className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </div>

            {viewMode === 'table' ? (
                <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-100 hover:bg-transparent">
                                    <TableHead className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-3 px-6">Colaborador</TableHead>
                                    <TableHead className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-3">Contrato</TableHead>
                                    <TableHead className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-3">Salario Base</TableHead>
                                    <TableHead className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-3">Estado</TableHead>
                                    <TableHead className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-3 text-right pr-6">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEmployees.length === 0 ? (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={5} className="py-16 text-center text-xs text-slate-400">
                                            No se han encontrado colaboradores.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredEmployees.map((emp) => (
                                        <TableRow key={emp.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                                        <User className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900">{emp.party?.legal_name}</p>
                                                        <p className="text-[10px] text-slate-400">{emp.party?.doc_number}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs text-slate-600">{emp.contract_type}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs font-bold text-slate-900 font-mono tabular-nums">
                                                    ${emp.salary.toLocaleString('es-CO')}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <Badge className={cn(
                                                        "border-none text-[10px]",
                                                        emp.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                                                    )}>
                                                        {emp.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                                                    </Badge>
                                                    {emp.user_id && (
                                                        <Badge className="border-none text-[10px] bg-indigo-50 text-indigo-600 gap-1">
                                                            <LinkIcon className="h-2.5 w-2.5" /> Portal
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={cn("h-8 w-8 rounded-lg", emp.user_id ? "text-indigo-500 hover:text-indigo-700" : "text-slate-300 hover:text-indigo-600")}
                                                        title={emp.user_id ? 'Cambiar usuario vinculado' : 'Vincular a Mi Nomina'}
                                                        onClick={() => setLinkModalEmployee(emp)}
                                                    >
                                                        <LinkIcon className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-900">
                                                        <Link href={`/payroll/employees/${emp.id}`}>
                                                            <ChevronRight className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEmployees.length === 0 ? (
                        <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
                            <Users className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm font-bold text-slate-900">No hay resultados</p>
                            <p className="text-xs text-slate-400 mt-1">Prueba con otro termino de busqueda</p>
                        </div>
                    ) : (
                        filteredEmployees.map((emp) => (
                            <Card key={emp.id} className="rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-100 hover:shadow-md transition-all duration-300 overflow-hidden">
                                <CardContent className="p-5 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                            <User className="h-4 w-4" />
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {emp.user_id && (
                                                <Badge className="border-none text-[10px] bg-indigo-50 text-indigo-600 gap-1">
                                                    <LinkIcon className="h-2.5 w-2.5" /> Portal
                                                </Badge>
                                            )}
                                            <Badge className={cn(
                                                "border-none text-[10px]",
                                                emp.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                                            )}>
                                                {emp.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 leading-snug">{emp.party?.legal_name}</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">{emp.contract_type} · {emp.party?.doc_number}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-50 p-3 rounded-xl">
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Salario</p>
                                            <p className="text-sm font-bold text-slate-900 font-mono tabular-nums">${emp.salary.toLocaleString('es-CO')}</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl">
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">ID</p>
                                            <p className="text-sm font-bold text-slate-900 font-mono">{emp.party?.doc_number}</p>
                                        </div>
                                    </div>

                                    {(emp.party?.email || emp.party?.phone) && (
                                        <div className="space-y-1.5">
                                            {emp.party?.email && (
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Mail className="h-3 w-3 shrink-0" />
                                                    <span className="text-xs truncate">{emp.party.email}</span>
                                                </div>
                                            )}
                                            {emp.party?.phone && (
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Phone className="h-3 w-3 shrink-0" />
                                                    <span className="text-xs">{emp.party.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex gap-2 pt-1">
                                        <Button asChild size="sm" className="flex-1 h-8 rounded-lg bg-slate-900 hover:bg-indigo-600 text-[10px]">
                                            <Link href={`/payroll/employees/${emp.id}`}>
                                                Editar Perfil
                                            </Link>
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg">
                                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-52 rounded-xl">
                                                <DropdownMenuItem
                                                    className="text-xs cursor-pointer"
                                                    onClick={() => setLinkModalEmployee(emp)}
                                                >
                                                    <LinkIcon className="mr-2 h-3.5 w-3.5 text-indigo-500" />
                                                    {emp.user_id ? 'Cambiar Usuario Vinculado' : 'Vincular a Mi Nomina'}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem asChild className="text-xs cursor-pointer">
                                                    <Link href="/payroll/settlement" className="flex items-center">
                                                        <Calculator className="mr-2 h-3.5 w-3.5 text-rose-500" /> Liquidar Nomina
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-xs cursor-pointer">
                                                    <Calendar className="mr-2 h-3.5 w-3.5 text-indigo-500" /> Historial Pagos
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-xs cursor-pointer text-red-600 focus:text-red-600"
                                                    onClick={() => handleDeactivateEmployee(emp)}
                                                >
                                                    <UserX className="mr-2 h-3.5 w-3.5" /> Desactivar Empleado
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

            {/* Link User Modal */}
            {linkModalEmployee && (
                <LinkUserModal
                    open={!!linkModalEmployee}
                    onOpenChange={(open) => { if (!open) setLinkModalEmployee(null) }}
                    employeeId={linkModalEmployee.id!}
                    employeeName={linkModalEmployee.party?.legal_name || 'Empleado'}
                    currentUserId={linkModalEmployee.user_id}
                />
            )}
        </div>
    )
}
