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
import {
    Loader2,
    DollarSign,
    CheckCircle2,
    XCircle,
    Info,
    Users
} from "lucide-react"

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

export function CreateBenefitModal({ isOpen, onClose, employees, tenantId, onSuccess }: Props) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [employeeId, setEmployeeId] = useState("")
    const [formData, setFormData] = useState({
        name: "",
        amount: 0,
        is_taxable: false,
        is_salary: false,
        frequency: 'MONTHLY' as 'MONTHLY' | 'ONE_TIME'
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!employeeId) {
            toast.error("Seleccione un empleado")
            return
        }
        setLoading(true)
        try {
            await financeService.createBenefit(supabase, {
                tenant_id: tenantId,
                employee_id: employeeId,
                name: formData.name,
                amount: formData.amount,
                is_taxable: formData.is_taxable,
                is_salary: formData.is_salary,
                frequency: formData.frequency,
                status: 'ACTIVE'
            })
            toast.success("Beneficio asignado correctamente")
            onSuccess()
            resetForm()
            onClose()
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Error al asignar el beneficio"
            console.error(err)
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setEmployeeId("")
        setFormData({ name: "", amount: 0, is_taxable: false, is_salary: false, frequency: 'MONTHLY' })
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose() } }}>
            <DialogContent className="sm:max-w-[460px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-base font-bold text-slate-900">Asignar Nuevo Beneficio</DialogTitle>
                    <DialogDescription className="text-xs text-slate-400">
                        Configure auxilios o beneficios extralegales
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

                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Nombre del Beneficio</Label>
                        <Input
                            required
                            placeholder="Ej: Auxilio de Alimentacion, Gasolina..."
                            className="h-9 rounded-xl text-xs"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Monto</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                                <Input
                                    type="number"
                                    required
                                    min="0"
                                    className="h-9 pl-9 rounded-xl text-xs"
                                    value={formData.amount || ""}
                                    onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Frecuencia</Label>
                            <select
                                className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl text-xs px-3 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                value={formData.frequency}
                                onChange={e => setFormData({ ...formData, frequency: e.target.value as 'MONTHLY' | 'ONE_TIME' })}
                            >
                                <option value="MONTHLY">Mensual</option>
                                <option value="ONE_TIME">Una vez</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, is_salary: !formData.is_salary })}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${formData.is_salary ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-100 text-slate-400 opacity-60'}`}
                        >
                            {formData.is_salary ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            <span className="text-[10px] font-semibold uppercase">Es Salarial</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, is_taxable: !formData.is_taxable })}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${formData.is_taxable ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-slate-100 text-slate-400 opacity-60'}`}
                        >
                            {formData.is_taxable ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            <span className="text-[10px] font-semibold uppercase">Tributable</span>
                        </button>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                        <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <p className="text-[10px] text-slate-500 leading-tight">
                            Si marca "Es Salarial", el monto sumara al IBC para calculos de Seguridad Social.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Asignar Beneficio"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
