"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { financeService } from "@/features/payroll/services/financeService"
import { PayrollLoan } from "@/features/payroll/types"
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
import { Loader2, DollarSign, Calendar, Hash, FileText } from "lucide-react"

interface Props {
    isOpen: boolean;
    onClose: () => void;
    employeeId: string;
    tenantId: string;
    onSuccess: () => void;
}

export function CreateLoanModal({ isOpen, onClose, employeeId, tenantId, onSuccess }: Props) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        amount_total: 0,
        installment_count: 12,
        description: "",
        start_date: new Date().toISOString().split('T')[0]
    })

    const installmentAmount = formData.amount_total > 0 ? (formData.amount_total / formData.installment_count) : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
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
            toast.success("Préstamo registrado correctamente")
            onSuccess()
            onClose()
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || "Error al registrar el préstamo")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] border-none shadow-premium rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black italic tracking-tighter text-slate-900">Registrar Nuevo Préstamo</DialogTitle>
                    <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Defina el monto total y el número de cuotas para descuento mensual
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Monto Total</Label>
                            <div className="relative group/input">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-primary transition-colors" />
                                <Input
                                    type="number"
                                    required
                                    min="0"
                                    className="h-14 pl-12 bg-slate-50 border-none rounded-2xl font-bold"
                                    value={formData.amount_total}
                                    onChange={e => setFormData({ ...formData, amount_total: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Cuotas</Label>
                            <div className="relative group/input">
                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-primary transition-colors" />
                                <Input
                                    type="number"
                                    required
                                    min="1"
                                    className="h-14 pl-12 bg-slate-50 border-none rounded-2xl font-bold"
                                    value={formData.installment_count}
                                    onChange={e => setFormData({ ...formData, installment_count: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Fecha de Inicio</Label>
                        <div className="relative group/input">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-primary transition-colors" />
                            <Input
                                type="date"
                                required
                                className="h-14 pl-12 bg-slate-50 border-none rounded-2xl font-bold"
                                value={formData.start_date}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Descripción / Motivo</Label>
                        <div className="relative group/input">
                            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-primary transition-colors" />
                            <Input
                                placeholder="Ej: Adelanto para vivienda, salud..."
                                className="h-14 pl-12 bg-slate-50 border-none rounded-2xl font-bold"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 text-center">Cuota Estimada Mensual</p>
                        <p className="text-3xl font-black text-indigo-600 text-center italic tracking-tighter">
                            ${new Intl.NumberFormat('es-CO').format(Math.round(installmentAmount))}
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-16 rounded-2xl bg-slate-900 hover:bg-primary text-white font-black italic tracking-tight text-xl transition-all shadow-xl active:scale-95"
                        >
                            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "CREAR PRÉSTAMO"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
