"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { financeService } from "@/features/payroll/services/financeService"
import { PayrollBenefit } from "@/features/payroll/types"
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
    Gift,
    DollarSign,
    CheckCircle2,
    XCircle,
    Info
} from "lucide-react"

interface Props {
    isOpen: boolean;
    onClose: () => void;
    employeeId: string;
    tenantId: string;
    onSuccess: () => void;
}

export function CreateBenefitModal({ isOpen, onClose, employeeId, tenantId, onSuccess }: Props) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        amount: 0,
        is_taxable: false,
        is_salary: false,
        frequency: 'MONTHLY' as const
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
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
            onClose()
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || "Error al asignar el beneficio")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] border-none shadow-premium rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black italic tracking-tighter text-slate-900">Asignar Nuevo Beneficio</DialogTitle>
                    <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Configure auxilios o beneficios extralegales
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nombre del Beneficio</Label>
                        <Input
                            required
                            placeholder="Ej: Auxilio de Alimentación, Gasolina..."
                            className="h-14 bg-slate-50 border-none rounded-2xl font-bold"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Monto</Label>
                            <div className="relative group/input">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-primary transition-colors" />
                                <Input
                                    type="number"
                                    required
                                    min="0"
                                    className="h-14 pl-12 bg-slate-50 border-none rounded-2xl font-bold"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Frecuencia</Label>
                            <select
                                className="w-full h-14 bg-slate-50 border-none rounded-2xl font-bold px-4 appearance-none"
                                value={formData.frequency}
                                onChange={e => setFormData({ ...formData, frequency: e.target.value as any })}
                            >
                                <option value="MONTHLY">Mensual</option>
                                <option value="ONE_TIME">Una vez</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, is_salary: !formData.is_salary })}
                            className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${formData.is_salary ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-100 text-slate-400 opacity-60'}`}
                        >
                            {formData.is_salary ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                            <span className="text-[10px] font-black uppercase">Es Salarial</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, is_taxable: !formData.is_taxable })}
                            className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${formData.is_taxable ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-slate-100 text-slate-400 opacity-60'}`}
                        >
                            {formData.is_taxable ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                            <span className="text-[10px] font-black uppercase">Tributable</span>
                        </button>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                        <Info className="h-4 w-4 text-slate-400 shrink-0" />
                        <p className="text-[9px] font-bold text-slate-500 leading-tight italic">
                            Si marca "Es Salarial", el monto sumará al IBC para cálculos de Seguridad Social.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-16 rounded-2xl bg-slate-900 hover:bg-primary text-white font-black italic tracking-tight text-xl transition-all shadow-xl active:scale-95"
                        >
                            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "ASIGNAR BENEFICIO"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
