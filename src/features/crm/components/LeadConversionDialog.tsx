"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import { Input } from "@/shared/components/ui/input"
import { Lead } from "../types"
import { convertLeadToOpportunityAction } from "../actions"
import { toast } from "sonner"
import { Loader2, ArrowRight, Building2, FileText, DollarSign, UserCheck, Target, TrendingUp } from "lucide-react"

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    lead: Lead | null
    onSuccess?: () => void
}

export function LeadConversionDialog({ open, onOpenChange, lead, onSuccess }: Props) {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        doc_type: 'NIT',
        doc_number: '',
        legal_name: '',
        opportunity_name: '',
        value: 0
    })

    // Pre-fill data when lead changes
    if (lead && open && !formData.legal_name && !formData.opportunity_name) {
        setFormData({
            ...formData,
            legal_name: lead.company_name || lead.name || '',
            opportunity_name: `Oportunidad: ${lead.company_name || lead.name}`,
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!lead?.id) return

        setIsLoading(true)
        try {
            const result = await convertLeadToOpportunityAction(
                lead.id,
                {
                    party_type: formData.doc_type === 'NIT' ? 'COMPANY' : 'PERSON',
                    doc_type: formData.doc_type as any,
                    doc_number: formData.doc_number,
                    legal_name: formData.legal_name,
                    email: lead.email,
                    phone: lead.phone,
                    trade_name: lead.company_name || lead.name,
                },
                formData.opportunity_name,
                Number(formData.value)
            )

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Prospecto convertido a cliente y oportunidad creada")
                onOpenChange(false)
                onSuccess?.()
            }
        } catch (error) {
            toast.error("Error al convertir el prospecto")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-white border-none shadow-premium rounded-[3.5rem] p-0 overflow-hidden relative border border-slate-50">
                {/* Decorative Background Icon */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.01] pointer-events-none">
                    <UserCheck className="h-64 w-64" />
                </div>

                <DialogHeader className="bg-slate-950 p-12 pb-10 text-white relative overflow-hidden">
                    {/* Scanline effect for header */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent h-1 w-full animate-scanline pointer-events-none" />

                    <div className="flex items-center gap-6 mb-6">
                        <div className="h-12 w-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-active rotate-3">
                            <ArrowRight className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-3xl font-black tracking-tighter italic uppercase leading-none">
                                Certificación de <span className="text-indigo-400">Cliente</span>
                            </DialogTitle>
                            <div className="h-1 w-20 bg-indigo-500/30 rounded-full" />
                        </div>
                    </div>
                    <DialogDescription className="text-white/40 font-black text-[10px] uppercase tracking-[0.4em] italic leading-relaxed">
                        PROTOCOLO DE CONVERSIÓN ACTIVO: TRANSFORMANDO PROSPECTO EN ENTIDAD CORPORATIVA Y OPORTUNIDAD DE NEGOCIO.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-10 p-12 bg-white">
                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 ml-6 italic">TIPO DOCUMENTAL</Label>
                            <div className="relative group/field">
                                <FileText className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-indigo-500 transition-colors" />
                                <select
                                    value={formData.doc_type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, doc_type: e.target.value }))}
                                    className="w-full h-14 pl-14 pr-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black italic uppercase text-slate-950 text-xs appearance-none cursor-pointer focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all shadow-inner outline-none"
                                >
                                    <option value="NIT">NIT - EMPRESARIAL</option>
                                    <option value="CC">CC - CIUDADANÍA</option>
                                    <option value="CE">CE - EXTRANJERÍA</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 ml-6 italic">ID DE ENTIDAD</Label>
                            <div className="relative group/field">
                                <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-indigo-500 transition-colors" />
                                <Input
                                    required
                                    value={formData.doc_number}
                                    onChange={e => setFormData(prev => ({ ...prev, doc_number: e.target.value }))}
                                    className="h-14 pl-14 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black italic uppercase text-slate-950 placeholder:text-slate-200 focus-visible:ring-4 focus-visible:ring-indigo-500/10 focus-visible:bg-white transition-all shadow-inner outline-none text-xs"
                                    placeholder="DIGITAR NÚMERO..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 ml-6 italic">DENOMINACIÓN LEGAL / RAZÓN SOCIAL</Label>
                        <div className="relative group/field">
                            <UserCheck className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-indigo-500 transition-colors" />
                            <Input
                                required
                                value={formData.legal_name}
                                onChange={e => setFormData(prev => ({ ...prev, legal_name: e.target.value }))}
                                className="h-14 pl-14 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black italic uppercase text-slate-950 placeholder:text-slate-200 focus-visible:ring-4 focus-visible:ring-indigo-500/10 focus-visible:bg-white transition-all shadow-inner outline-none text-xs"
                                placeholder="NOMBRE COMPLETO DE LA ENTIDAD..."
                            />
                        </div>
                    </div>

                    <div className="p-8 rounded-[2.5rem] bg-slate-950 shadow-active border border-white/5 space-y-8 relative overflow-hidden group/opt">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 group-hover/opt:scale-125 transition-transform duration-1000">
                            <Target className="h-20 w-20 text-indigo-400" />
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_#6366f1]" />
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em] italic">DATOS DE OPORTUNIDAD COMERCIAL</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 ml-4 italic">TAG DE NEGOCIO</Label>
                                <Input
                                    required
                                    value={formData.opportunity_name}
                                    onChange={e => setFormData(prev => ({ ...prev, opportunity_name: e.target.value }))}
                                    className="h-14 px-6 bg-white/5 border border-white/10 rounded-2xl font-black italic uppercase text-white placeholder:text-white/10 focus-visible:ring-4 focus-visible:ring-indigo-500/20 focus-visible:bg-white/10 transition-all outline-none text-xs"
                                />
                            </div>
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 ml-4 italic">VALOR ACORDADO</Label>
                                <div className="relative group/field">
                                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400 group-focus-within/field:text-white transition-colors" />
                                    <Input
                                        type="number"
                                        min="0"
                                        value={formData.value}
                                        onChange={e => setFormData(prev => ({ ...prev, value: Number(e.target.value) }))}
                                        className="h-14 pl-14 bg-white/5 border border-white/10 rounded-2xl font-black italic uppercase text-white placeholder:text-white/10 focus-visible:ring-4 focus-visible:ring-indigo-500/20 focus-visible:bg-white/10 transition-all outline-none text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-6 gap-6 sm:justify-between items-center sm:flex-row-reverse w-full">
                        <Button type="submit" disabled={isLoading} className="h-16 px-12 rounded-[1.8rem] bg-indigo-600 hover:bg-white hover:text-slate-950 text-white font-black text-[11px] uppercase tracking-[0.4em] shadow-active transition-all hover:scale-105 active:scale-95 disabled:opacity-20 italic flex items-center gap-6 border-none whitespace-nowrap order-last sm:order-first">
                            {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                            {!isLoading && <ArrowRight className="h-5 w-5" />}
                            INICIAR CONVERSIÓN
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-12 px-6 rounded-xl text-slate-300 hover:text-rose-500 font-black italic uppercase tracking-[0.3em] text-[10px] transition-colors order-first sm:order-last">
                            ABORTAR PROCESO
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
