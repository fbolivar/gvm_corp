"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { treasuryTransactionSchema, TreasuryTransaction, TreasuryAccount } from "../types"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { treasuryService } from "../services/treasuryService"
import { Party } from "@/features/parties/types"
import { partyService } from "@/features/parties/services/partyService"
import { useSearchParams } from "next/navigation"
import {
    Wallet,
    User,
    Calendar,
    DollarSign,
    FileText,
    ChevronDown,
    CheckCircle2,
    ShieldCheck,
    History,
    AlertCircle,
    Info,
    ArrowRightLeft,
    ArrowUpCircle,
    ArrowDownCircle,
    Sparkles,
    Landmark,
    Banknote,
    Activity,
    Cpu,
    Zap,
    Scale
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { WithholdingSelector } from "./WithholdingSelector"
import { Badge } from "@/shared/components/ui/badge"

interface TreasuryTransactionFormProps {
    type: 'RECEIPT' | 'PAYMENT'
    onSubmit: (data: TreasuryTransaction, options: { allocations: any[], withholdings: any[] }) => Promise<void>
    isLoading?: boolean
}

export function TreasuryTransactionForm({ type, onSubmit, isLoading }: TreasuryTransactionFormProps) {
    const supabase = createClient()
    const searchParams = useSearchParams()

    const [accounts, setAccounts] = useState<TreasuryAccount[]>([])
    const [parties, setParties] = useState<Party[]>([])
    const [pendingDocs, setPendingDocs] = useState<any[]>([])
    const [selectedDocs, setSelectedDocs] = useState<string[]>([])
    const [withholdings, setWithholdings] = useState<any[]>([])

    const initialPartyId = searchParams.get('party_id') || ''
    const initialInvoiceId = searchParams.get('invoice_id') || ''

    const form = useForm<TreasuryTransaction>({
        resolver: zodResolver(treasuryTransactionSchema) as any,
        defaultValues: {
            transaction_type: type,
            date: new Date().toISOString().split('T')[0],
            amount: 0,
            description: '',
            reference_number: '',
            tenant_id: '',
            party_id: initialPartyId
        }
    })

    const selectedPartyId = form.watch('party_id')
    const totalAmount = form.watch('amount')

    useEffect(() => {
        async function loadInitialData() {
            const [accs, ptsRes] = await Promise.all([
                treasuryService.getAccounts(supabase),
                partyService.getParties(supabase, { page: 1, per_page: 100, role: 'all' })
            ])
            setAccounts(accs)
            setParties(ptsRes.data || [])
        }
        loadInitialData()
    }, [])

    useEffect(() => {
        if (selectedPartyId) {
            treasuryService.getPendingDocuments(supabase, selectedPartyId, type)
                .then(docs => {
                    setPendingDocs(docs)
                    // If target invoice_id is provided, pre-select it
                    if (initialInvoiceId && docs.some(d => d.id === initialInvoiceId)) {
                        setSelectedDocs([initialInvoiceId])
                        const targetDoc = docs.find(d => d.id === initialInvoiceId)
                        if (targetDoc) {
                            form.setValue('amount', targetDoc.total)
                        }
                    }
                })
        } else {
            setPendingDocs([])
            setSelectedDocs([])
        }
    }, [selectedPartyId, type, initialInvoiceId])

    const handleSelectDoc = (docId: string, balance: number) => {
        setSelectedDocs(prev => {
            const isSelected = prev.includes(docId);
            const newList = isSelected ? prev.filter(id => id !== docId) : [...prev, docId];

            // Auto-update amount if selecting only one doc
            if (newList.length === 1) {
                const doc = pendingDocs.find(d => d.id === newList[0]);
                if (doc) form.setValue('amount', doc.balance);
            }

            return newList;
        })
    }

    const onFormSubmit = (data: TreasuryTransaction) => {
        const allocations = selectedDocs.map(docId => ({
            document_id: docId,
            amount: data.amount / (selectedDocs.length || 1)
        }))

        const finalData = {
            ...data,
            amount: type === 'PAYMENT' ? -Math.abs(data.amount) : Math.abs(data.amount)
        }

        onSubmit(finalData, { allocations, withholdings })
    }

    return (
        <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 max-w-5xl mx-auto pb-24">

            {/* 🏎️ PREMIUM HEADER POD */}
            <div className="relative group overflow-hidden bg-slate-900 rounded-[4rem] p-12 text-white shadow-active">
                {/* Decorators */}
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none group-hover:scale-110 group-hover:rotate-6 transition-transform duration-1000">
                    <Banknote className="h-48 w-48" />
                </div>
                <div className="absolute -bottom-10 -left-10 opacity-[0.05] pointer-events-none">
                    <Cpu className="h-64 w-64" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className={cn("h-3 w-3 rounded-full animate-pulse", type === 'RECEIPT' ? "bg-emerald-500" : "bg-rose-500")} />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">Terminal de Transacciones</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter italic uppercase leading-tight">
                            {type === 'RECEIPT' ? 'Ingreso de' : 'Salida de'}<br />
                            <span className={type === 'RECEIPT' ? "text-emerald-500" : "text-rose-500"}>
                                {type === 'RECEIPT' ? 'Liquidez' : 'Capital'}
                            </span>
                        </h1>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em]">Protocolo de Tesorería v3.0 // Auditoría Activa</p>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-3 text-center md:text-right">
                        <div className="h-20 w-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center shadow-lg backdrop-blur-md">
                            <ShieldCheck className="h-10 w-10 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest italic opacity-60">Operación</span>
                            <p className="text-sm font-black text-white uppercase tracking-[0.2em]">Enlace Seguro</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🛠️ CORE FORM CARD */}
            <Card className="rounded-[4rem] bg-white border-none shadow-premium overflow-hidden group border border-slate-50">
                <CardContent className="p-12 md:p-16 space-y-12">

                    {/* Sección 1: Eje de la Transacción */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 ml-6 block italic">Fuente / Destino Local</Label>
                            <div className="relative group/field">
                                <Landmark className="absolute left-7 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <select
                                    {...form.register('account_id')}
                                    className="w-full h-20 pl-16 pr-14 bg-slate-50 border-none rounded-[2rem] font-black text-slate-900 text-lg focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer shadow-inner"
                                >
                                    <option value="">Seleccionar canal...</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} — ${acc.balance?.toLocaleString('es-CO')}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-300 pointer-events-none" />
                            </div>
                            {form.formState.errors.account_id && <p className="text-rose-500 text-[10px] font-black uppercase tracking-tight ml-6">{form.formState.errors.account_id.message}</p>}
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 ml-6 block italic">Fecha Operativa</Label>
                            <div className="relative group/field">
                                <Calendar className="absolute left-7 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <Input
                                    type="date"
                                    {...form.register('date')}
                                    className="h-20 pl-16 bg-slate-50 border-none rounded-[2rem] font-black text-slate-900 text-lg focus-visible:ring-4 focus-visible:ring-primary/10 transition-all shadow-inner"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 ml-6 block italic">Entidad de Negocio / Tercero</Label>
                        <div className="relative group/field">
                            <User className="absolute left-7 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                            <select
                                {...form.register('party_id')}
                                className="w-full h-20 pl-16 pr-14 bg-slate-50 border-none rounded-[2rem] font-black text-slate-900 text-lg focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer shadow-inner uppercase"
                            >
                                <option value="">Vincular tercero...</option>
                                {parties.map(p => (
                                    <option key={p.id} value={p.id}>{p.legal_name} | {p.doc_number}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-300 pointer-events-none" />
                        </div>
                    </div>

                    {/* Sección 2: Magnitudes Financieras */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 ml-6 block italic">Magnitud del Movimiento</Label>
                            <div className="relative group/field">
                                <DollarSign className={cn(
                                    "absolute left-8 top-1/2 -translate-y-1/2 h-8 w-8 font-black italic",
                                    type === 'RECEIPT' ? "text-emerald-500" : "text-rose-500"
                                )} />
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...form.register('amount', { valueAsNumber: true })}
                                    className="h-28 pl-16 bg-slate-50 border-none rounded-[2.5rem] font-black text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all text-5xl font-mono tracking-tighter italic shadow-inner"
                                />
                                <span className="absolute right-10 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] hidden sm:block">Valores en COP</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 ml-6 block italic">Referencia Técnica</Label>
                            <div className="relative group/field">
                                <FileText className="absolute left-7 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <Input
                                    {...form.register('reference_number')}
                                    placeholder="N° PROTOCOLO / DOCUMENTO"
                                    className="h-28 pl-16 bg-slate-50 border-none rounded-[2.5rem] font-black text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all text-3xl uppercase tracking-[0.2em] placeholder:text-slate-200 shadow-inner"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 ml-6 block italic">Memo Operativo</Label>
                        <div className="relative group/field">
                            <Info className="absolute left-7 top-6 h-6 w-6 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                            <textarea
                                {...form.register('description')}
                                placeholder="Describa el origen o propósito de esta asignación de fondos..."
                                className="w-full pl-16 pt-6 pr-10 bg-slate-50 border-none rounded-[2.5rem] font-black text-slate-900 text-lg focus:ring-4 focus:ring-primary/10 transition-all min-h-[140px] resize-none outline-none shadow-inner italic"
                            />
                        </div>
                    </div>

                    {/* 🛡️ TAX ENGINE SECTION */}
                    <div className="pt-16 border-t border-slate-50 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-[1.2rem] bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm group-hover:rotate-6 transition-transform">
                                <Scale className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Cálculo de Retenciones</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">Estatuto Tributario Vigente</p>
                            </div>
                        </div>
                        <div className="bg-slate-50/50 rounded-[3rem] p-10 border border-slate-50/50 shadow-inner">
                            <WithholdingSelector baseAmount={totalAmount} onChange={setWithholdings} />
                        </div>
                    </div>

                    {/* 📜 PORTFOLIO ALIGNMENT SECTION */}
                    {pendingDocs.length > 0 && (
                        <div className="pt-16 border-t border-slate-50 space-y-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-[1.2rem] bg-amber-50 flex items-center justify-center text-amber-600 shadow-sm group-hover:rotate-12 transition-transform">
                                        <Activity className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Cruce de Pasivos / Activos</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">Afectación Documental Directa</p>
                                    </div>
                                </div>
                                <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-5 py-2 rounded-full border border-slate-200">
                                    <Zap className="h-3 w-3 text-primary animate-pulse" />
                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{pendingDocs.length} DOCS DETECTADOS</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar p-1">
                                {pendingDocs.map(doc => {
                                    const isSelected = selectedDocs.includes(doc.id!);
                                    return (
                                        <div
                                            key={doc.id}
                                            onClick={() => handleSelectDoc(doc.id!, doc.balance)}
                                            className={cn(
                                                "cursor-pointer group relative flex flex-col p-8 rounded-[3.5rem] border-2 transition-all duration-700 overflow-hidden",
                                                isSelected
                                                    ? type === 'RECEIPT' ? "bg-slate-950 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)] scale-[1.02]" : "bg-slate-950 border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.15)] scale-[1.02]"
                                                    : "bg-slate-50 border-slate-100 hover:bg-slate-950 hover:border-slate-800 hover:scale-[1.01]"
                                            )}
                                        >
                                            {/* Decorative background pulse for selected state */}
                                            {isSelected && (
                                                <div className={cn(
                                                    "absolute -bottom-10 -right-10 w-40 h-40 blur-3xl opacity-20",
                                                    type === 'RECEIPT' ? "bg-emerald-500" : "bg-rose-500"
                                                )} />
                                            )}

                                            <div className="flex items-center justify-between mb-8 relative z-10">
                                                <div className={cn(
                                                    "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-700 shadow-sm",
                                                    isSelected
                                                        ? type === 'RECEIPT' ? "bg-emerald-500 text-white shadow-emerald-500/30 rotate-12 scale-110" : "bg-rose-500 text-white shadow-rose-500/30 rotate-12 scale-110"
                                                        : "bg-white text-slate-300 group-hover:bg-white/10 group-hover:text-slate-500"
                                                )}>
                                                    {isSelected ? <CheckCircle2 className="h-7 w-7" /> : <Activity className="h-6 w-6" />}
                                                </div>
                                                <Badge variant="outline" className={cn(
                                                    "border-none rounded-full px-4 py-2 font-black text-[9px] tracking-[0.3em] uppercase italic",
                                                    isSelected ? "bg-white/10 text-white" : "bg-white text-slate-400 group-hover:bg-white/5 group-hover:text-slate-500"
                                                )}>
                                                    {doc.doc_type}
                                                </Badge>
                                            </div>

                                            <div className="space-y-6 relative z-10">
                                                <div className="flex flex-col gap-1">
                                                    <span className={cn("text-3xl font-black font-mono tracking-tighter italic leading-none transition-colors", isSelected ? "text-white" : "text-slate-900 group-hover:text-white")}>
                                                        {doc.number || 'DOC-X'}
                                                    </span>
                                                </div>

                                                <div className={cn("pt-6 border-t flex items-center justify-between transition-colors", isSelected ? "border-white/10" : "border-slate-200 group-hover:border-white/10")}>
                                                    <div className="flex flex-col gap-1">
                                                        <span className={cn("text-[9px] font-black uppercase tracking-[0.4em] italic leading-none", isSelected ? "text-slate-400" : "text-slate-400 group-hover:text-slate-500")}>Fecha de Emisión</span>
                                                        <span className={cn("text-xs font-black uppercase tracking-widest", isSelected ? "text-slate-300" : "text-slate-500 group-hover:text-slate-400")}>
                                                            {doc.issue_date}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={cn("text-[9px] font-black uppercase tracking-[0.4em] italic leading-none block mb-1", isSelected ? "text-slate-400" : "text-slate-400 group-hover:text-slate-500")}>Saldo Pendiente</span>
                                                        <span className={cn("text-2xl font-black font-mono tracking-tighter", isSelected ? "text-white" : "text-slate-900 group-hover:text-white")}>
                                                            <span className={cn("text-sm mr-1", isSelected ? "text-slate-500" : "text-slate-300 group-hover:text-slate-600")}>$</span>
                                                            {doc.balance?.toLocaleString('es-CO')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* 🚀 ACTION POD */}
                    <div className="pt-16 border-t border-slate-50 flex flex-col sm:flex-row gap-8">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className={cn(
                                "flex-1 h-32 rounded-[3.5rem] font-black italic tracking-tighter text-3xl transition-all shadow-active active:scale-95 group overflow-hidden relative border-none",
                                type === 'RECEIPT' ? "bg-emerald-500 hover:bg-emerald-400 text-white" : "bg-slate-900 hover:bg-primary text-white"
                            )}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                            {isLoading ? (
                                <div className="flex items-center gap-6">
                                    <div className="h-10 w-10 border-8 border-white/20 border-t-white rounded-full animate-spin" />
                                    <span>ENCRIPTANDO ASIENTO...</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center gap-4">
                                        <CheckCircle2 className="h-10 w-10 group-hover:scale-125 transition-transform duration-700" />
                                        <span>FIDELIZAR OPERACIÓN</span>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.5em] mt-2 opacity-60 italic">Generar Registro de Tesorería</span>
                                </div>
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            className="h-32 px-12 rounded-[3.5rem] text-slate-300 hover:text-slate-900 hover:bg-slate-50 font-black uppercase tracking-[0.4em] text-xs transition-all border border-slate-100/50"
                        >
                            Abortar
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </form>
    )
}
