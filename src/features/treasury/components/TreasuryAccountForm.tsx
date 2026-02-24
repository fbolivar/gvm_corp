"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { treasuryAccountSchema, TreasuryAccount } from "../types"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Landmark, Wallet, Hash, Save, ShieldCheck, ChevronDown, Sparkles, AlertCircle } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface TreasuryAccountFormProps {
    initialData?: Partial<TreasuryAccount>
    onSubmit: (data: TreasuryAccount) => Promise<void>
    isLoading?: boolean
    chartAccounts?: any[]
}

export function TreasuryAccountForm({ initialData, onSubmit, isLoading, chartAccounts }: TreasuryAccountFormProps) {
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors }
    } = useForm<TreasuryAccount>({
        resolver: zodResolver(treasuryAccountSchema) as any,
        defaultValues: {
            balance: 0,
            type: 'BANK',
            ...initialData
        }
    })

    const accountType = watch('type')

    return (
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-1000 max-w-4xl mx-auto pb-20">
            <Card className="rounded-[3rem] bg-white border-none shadow-premium overflow-hidden group">
                <CardHeader className="p-10 bg-slate-50/50 border-b border-slate-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm transition-transform group-hover:scale-110 duration-500">
                                <Landmark className="h-7 w-7" />
                            </div>
                            <div className="space-y-1">
                                <CardTitle className="text-2xl font-black text-slate-900 tracking-tight italic">Configuración de Cuenta</CardTitle>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Maestro de Tesorería & Disponibilidad</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50/50 rounded-full">
                            <ShieldCheck className="h-4 w-4 text-indigo-500" />
                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Verificado</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-10 space-y-10">
                    {/* 🔄 Account Type Selection */}
                    <div className="grid grid-cols-2 gap-6 p-2 bg-slate-50 rounded-[2rem]">
                        <label className={cn(
                            "flex items-center justify-center gap-3 h-16 rounded-[1.5rem] cursor-pointer transition-all font-black text-[11px] uppercase tracking-widest border-2",
                            accountType === 'BANK'
                                ? "bg-white border-indigo-500 text-indigo-600 shadow-sm"
                                : "bg-transparent border-transparent text-slate-400 hover:text-slate-600"
                        )}>
                            <input type="radio" {...register("type")} value="BANK" className="hidden" />
                            <Landmark className="h-5 w-5" />
                            Cuenta Bancaria
                        </label>
                        <label className={cn(
                            "flex items-center justify-center gap-3 h-16 rounded-[1.5rem] cursor-pointer transition-all font-black text-[11px] uppercase tracking-widest border-2",
                            accountType === 'CASH'
                                ? "bg-white border-emerald-500 text-emerald-600 shadow-sm"
                                : "bg-transparent border-transparent text-slate-400 hover:text-slate-600"
                        )}>
                            <input type="radio" {...register("type")} value="CASH" className="hidden" />
                            <Wallet className="h-5 w-5" />
                            Efectivo / Caja
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Basic Info */}
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Nombre Identificador</Label>
                                <div className="relative group/field">
                                    <Input
                                        {...register("name")}
                                        placeholder="Ej: Banco Principal Emp"
                                        className="h-14 pl-6 bg-slate-50 border-none rounded-2xl font-black text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all text-lg placeholder:text-slate-200"
                                    />
                                </div>
                                {errors.name && <p className="text-rose-500 text-[10px] font-black uppercase tracking-tighter ml-5">{errors.name.message}</p>}
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Contraste Contable (PUC)</Label>
                                <div className="relative group/field">
                                    <select
                                        {...register("chart_account_id")}
                                        className="w-full h-14 pl-6 pr-12 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                                    >
                                        <option value="">Seleccionar Cuenta PUC...</option>
                                        {chartAccounts?.map(ca => (
                                            <option key={ca.id} value={ca.id}>{ca.code} - {ca.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none" />
                                </div>
                                {errors.chart_account_id && <p className="text-rose-500 text-[10px] font-black uppercase tracking-tighter ml-5">{errors.chart_account_id.message}</p>}
                            </div>
                        </div>

                        {/* Technical Details (Conditional) */}
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">
                                    {accountType === 'BANK' ? 'Nombre del Banco' : 'Ubicación / Responsable'}
                                </Label>
                                <div className="relative group/field">
                                    <Input
                                        {...register("bank_name")}
                                        placeholder={accountType === 'BANK' ? "Ej: Bancolombia" : "Ej: Caja Menor Oficina"}
                                        className="h-14 pl-6 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">
                                    {accountType === 'BANK' ? 'Número de Cuenta / IBAN' : 'Identificador de Caja'}
                                </Label>
                                <div className="relative group/field">
                                    <Hash className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                                    <Input
                                        {...register("account_number")}
                                        placeholder="0000-0000-0000"
                                        className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-black text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Initial Balance Panel */}
                    <div className="p-10 rounded-[2.5rem] bg-indigo-600 text-white relative overflow-hidden group/balance mt-10 shadow-active">
                        <div className="absolute top-0 right-0 p-10 opacity-10 group-hover/balance:scale-125 transition-transform duration-700 pointer-events-none">
                            <Sparkles className="h-32 w-32" />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <AlertCircle className="h-5 w-5 text-indigo-300" />
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">Saldo de Apertura</h4>
                                </div>
                                <p className="text-white/60 text-xs font-medium max-w-xs leading-relaxed">
                                    Defina el capital inicial disponible en esta cuenta al momento de la vinculación al sistema.
                                </p>
                            </div>
                            <div className="relative w-full md:w-64 group/field4">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-indigo-300 italic opacity-50">$</span>
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...register("balance", { valueAsNumber: true })}
                                    className="h-20 pl-12 bg-white/10 border-white/20 rounded-3xl font-black text-white focus-visible:ring-offset-0 focus-visible:ring-4 focus-visible:ring-white/20 transition-all text-3xl font-mono tracking-tighter"
                                />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-200 uppercase tracking-widest">COP</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-10 border-t border-slate-50 flex flex-col sm:flex-row gap-6">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 h-20 rounded-[2.5rem] bg-slate-900 hover:bg-primary text-white font-black italic tracking-tight text-xl transition-all shadow-active active:scale-95 group overflow-hidden relative"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-4">
                                    <div className="h-7 w-7 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                    <span>VINCULANDO...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Save className="h-7 w-7 group-hover:scale-110 transition-transform" />
                                    <span>GUARDAR CONFIGURACIÓN BANCARIA</span>
                                    <Sparkles className="h-6 w-6 absolute -top-1 right-6 opacity-10 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            className="h-20 px-10 rounded-[2.5rem] text-slate-400 hover:text-slate-900 font-black uppercase tracking-widest text-[10px] transition-all"
                        >
                            Cancelar
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </form>
    )
}
