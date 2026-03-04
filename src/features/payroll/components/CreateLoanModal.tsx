"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { financeService } from "@/features/payroll/services/financeService"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Loader2, DollarSign, Calendar, Hash, FileText, Users } from "lucide-react"

interface EmployeeOption {
    id: string;
    name: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    employees: EmployeeOption[];
    tenantId: string;
    onSuccess: () => void;
}

export function CreateLoanModal({ isOpen, onClose, employees, tenantId, onSuccess }: Props) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [employeeId, setEmployeeId] = useState("")
    const [formData, setFormData] = useState({
        amount_total: 0,
        installment_count: 12,
        description: "",
        start_date: new Date().toISOString().split('T')[0]
    })

    const installmentAmount = formData.amount_total > 0 ? (formData.amount_total / formData.installment_count) : 0

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!employeeId) {
            toast.error("Seleccione un empleado")
            return
        }
        setLoading(true)
        try {
            await financeService.createLoan(supabase, {
                tenant_id: tenantId,
                employee_id: employeeId,
                amount_total: formData.amount_total,
                amount_paid: 0,
                installment_count: formData.installment_count,
                installments_paid: 0,
                installment_amount: installmentAmount,
                interest_rate: 0,
                start_date: formData.start_date,
                description: formData.description,
                status: 'ACTIVE'
            })
            toast.success("Prestamo registrado correctamente")
            onSuccess()
            resetForm()
            onClose()
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Error al registrar el prestamo"
            console.error(err)
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setEmployeeId("")
        setFormData({ amount_total: 0, installment_count: 12, description: "", start_date: new Date().toISOString().split('T')[0] })
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose() } }}>
            <DialogContent className="sm:max-w-[460px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-base font-bold text-slate-900">Registrar Nuevo Prestamo</DialogTitle>
                    <DialogDescription className="text-xs text-slate-400">
                        Defina el monto total y el numero de cuotas para descuento mensual
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    {/* Employee selector */}
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Empleado</Label>
                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                            <select
                                required
                                value={employeeId}
                                onChange={e => setEmployeeId(e.target.value)}
                                className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                                <option value="">Seleccione un empleado...</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Monto Total</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                                <Input
                                    type="number"
                                    required
                                    min="0"
                                    className="h-9 pl-9 rounded-xl text-xs"
                                    value={formData.amount_total || ""}
                                    onChange={e => setFormData({ ...formData, amount_total: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cuotas</Label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                                <Input
                                    type="number"
                                    required
                                    min="1"
                                    className="h-9 pl-9 rounded-xl text-xs"
                                    value={formData.installment_count}
                                    onChange={e => setFormData({ ...formData, installment_count: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fecha de Inicio</Label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                            <Input
                                type="date"
                                required
                                className="h-9 pl-9 rounded-xl text-xs"
                                value={formData.start_date}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Descripcion / Motivo</Label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                            <Input
                                placeholder="Ej: Adelanto para vivienda, salud..."
                                className="h-9 pl-9 rounded-xl text-xs"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-center space-y-1">
                        <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">Cuota Estimada Mensual</p>
                        <p className="text-lg font-bold text-indigo-600 font-mono tabular-nums">
                            ${new Intl.NumberFormat('es-CO').format(Math.round(installmentAmount))}
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear Prestamo"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
