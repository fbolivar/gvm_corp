"use client"

import { useState, useEffect } from "react"
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
    // Marca si el usuario editó manualmente la razón social: si lo hizo, no la
    // volvemos a sobrescribir al cambiar el tipo de documento.
    const [legalNameTouched, setLegalNameTouched] = useState(false)
    const [formData, setFormData] = useState({
        doc_type: 'NIT',
        doc_number: '',
        dv: '',
        legal_name: '',
        opportunity_name: '',
        value: 0
    })

    // Razón social sugerida según el tipo de documento:
    //  - NIT (empresa): el nombre de la empresa del prospecto.
    //  - CC/CE (persona): el nombre de la persona del prospecto.
    const suggestLegalName = (docType: string, l: Lead | null) => {
        if (!l) return ''
        return docType === 'NIT' ? (l.company_name || l.name || '') : (l.name || '')
    }

    // Sincroniza el formulario con el prospecto cada vez que se abre el diálogo.
    // Clave: lead.id + open. Sin esto, el estado del formulario persiste entre
    // prospectos distintos (la instancia del diálogo es única) y el segundo
    // prospecto en adelante mostraba los datos del anterior ("no coincide la información").
    // El tipo de documento inicial se infiere: si el prospecto trae empresa → NIT, si no → CC.
    useEffect(() => {
        if (open && lead) {
            const initialDocType = lead.company_name ? 'NIT' : 'CC'
            setLegalNameTouched(false)
            setFormData({
                doc_type: initialDocType,
                doc_number: '',
                dv: '',
                legal_name: suggestLegalName(initialDocType, lead),
                opportunity_name: `Oportunidad: ${lead.company_name || lead.name}`,
                value: 0,
            })
        }
    }, [lead?.id, open])

    // Al cambiar el tipo de documento, reajusta la razón social sugerida
    // (salvo que el usuario ya la haya escrito a mano).
    const handleDocTypeChange = (newType: string) => {
        setFormData(prev => ({
            ...prev,
            doc_type: newType,
            legal_name: legalNameTouched ? prev.legal_name : suggestLegalName(newType, lead),
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!lead?.id) return

        setIsLoading(true)
        try {
            const isNit = formData.doc_type === 'NIT'
            const result = await convertLeadToOpportunityAction(
                lead.id,
                {
                    party_type: isNit ? 'COMPANY' : 'PERSON',
                    doc_type: formData.doc_type as any,
                    doc_number: formData.doc_number.trim(),
                    // Para empresas, la app y los documentos identifican al tercero por `nit` (+ dígito de verificación).
                    nit: isNit ? formData.doc_number.trim() : null,
                    dv: isNit ? (formData.dv.trim() || null) : null,
                    legal_name: formData.legal_name.trim(),
                    email: lead.email,
                    phone: lead.phone,
                    trade_name: lead.company_name || lead.name,
                    // Persona de contacto del prospecto (útil sobre todo cuando el tercero es una empresa).
                    contact_name: lead.name || null,
                } as any,
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
            <DialogContent className="sm:max-w-[600px] bg-white border-none shadow-premium rounded-[2rem] p-0 overflow-y-auto overflow-x-hidden relative border border-slate-50 max-h-[90vh]">
                {/* Decorative Background Icon */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.01] pointer-events-none">
                    <UserCheck className="h-64 w-64" />
                </div>

                <DialogHeader className="bg-slate-950 p-6 md:p-8 text-white relative overflow-hidden">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-active shrink-0">
                            <ArrowRight className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-xl md:text-2xl font-black tracking-tight italic uppercase leading-none">
                                Certificación de <span className="text-indigo-400">Cliente</span>
                            </DialogTitle>
                            <DialogDescription className="text-white/40 font-bold text-[9px] uppercase tracking-[0.3em] italic leading-tight">
                                Convertir prospecto en cliente y oportunidad
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6 p-6 md:p-8 bg-white">
                    {/* Identidad del prospecto que se está convirtiendo: evita la confusión de
                        "no coincide la información" dejando a la vista de quién es esta conversión. */}
                    {lead && (
                        <div className="rounded-[1.25rem] bg-slate-50 border border-slate-100 p-4 space-y-1.5">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-indigo-500" />
                                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Prospecto a convertir</span>
                            </div>
                            <p className="text-base font-black text-slate-950 leading-tight">{lead.name}</p>
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-slate-500 font-medium">
                                {lead.company_name && <span>Empresa: <span className="text-slate-700 font-semibold">{lead.company_name}</span></span>}
                                {lead.email && <span>{lead.email}</span>}
                                {lead.phone && <span>{lead.phone}</span>}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 ml-6 italic">TIPO DOCUMENTAL</Label>
                            <div className="relative group/field">
                                <FileText className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-indigo-500 transition-colors" />
                                <select
                                    value={formData.doc_type}
                                    onChange={(e) => handleDocTypeChange(e.target.value)}
                                    className="w-full h-14 pl-14 pr-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black italic uppercase text-slate-950 text-xs appearance-none cursor-pointer focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all shadow-inner outline-none"
                                >
                                    <option value="NIT">NIT - EMPRESARIAL</option>
                                    <option value="CC">CC - CIUDADANÍA</option>
                                    <option value="CE">CE - EXTRANJERÍA</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 ml-6 italic">
                                {formData.doc_type === 'NIT' ? 'NIT / DV' : 'ID DE ENTIDAD'}
                            </Label>
                            <div className="flex gap-3">
                                <div className="relative group/field flex-1">
                                    <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-indigo-500 transition-colors" />
                                    <Input
                                        required
                                        value={formData.doc_number}
                                        onChange={e => setFormData(prev => ({ ...prev, doc_number: e.target.value }))}
                                        className="h-14 pl-14 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black italic uppercase text-slate-950 placeholder:text-slate-200 focus-visible:ring-4 focus-visible:ring-indigo-500/10 focus-visible:bg-white transition-all shadow-inner outline-none text-xs"
                                        placeholder="DIGITAR NÚMERO..."
                                    />
                                </div>
                                {formData.doc_type === 'NIT' && (
                                    <Input
                                        value={formData.dv}
                                        onChange={e => setFormData(prev => ({ ...prev, dv: e.target.value }))}
                                        maxLength={1}
                                        inputMode="numeric"
                                        className="h-14 w-16 text-center bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black italic text-slate-950 placeholder:text-slate-200 focus-visible:ring-4 focus-visible:ring-indigo-500/10 focus-visible:bg-white transition-all shadow-inner outline-none text-xs"
                                        placeholder="DV"
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 ml-6 italic">DENOMINACIÓN LEGAL / RAZÓN SOCIAL</Label>
                        <div className="relative group/field">
                            <UserCheck className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-indigo-500 transition-colors" />
                            <Input
                                required
                                value={formData.legal_name}
                                onChange={e => { setLegalNameTouched(true); setFormData(prev => ({ ...prev, legal_name: e.target.value })) }}
                                className="h-14 pl-14 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black italic uppercase text-slate-950 placeholder:text-slate-200 focus-visible:ring-4 focus-visible:ring-indigo-500/10 focus-visible:bg-white transition-all shadow-inner outline-none text-xs"
                                placeholder="NOMBRE COMPLETO DE LA ENTIDAD..."
                            />
                        </div>
                    </div>

                    <div className="p-5 rounded-[1.5rem] bg-slate-950 shadow-active border border-white/5 space-y-5 relative overflow-hidden group/opt">
                        <div className="absolute top-0 right-0 p-6 opacity-[0.03] rotate-12">
                            <Target className="h-16 w-16 text-indigo-400" />
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_#0096E6]" />
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] italic">Datos de oportunidad comercial</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 ml-4 italic">TAG DE NEGOCIO</Label>
                                <Input
                                    required
                                    value={formData.opportunity_name}
                                    onChange={e => setFormData(prev => ({ ...prev, opportunity_name: e.target.value }))}
                                    className="h-14 px-6 bg-white/5 border border-white/10 rounded-2xl font-black italic uppercase text-white placeholder:text-white/10 focus-visible:ring-4 focus-visible:ring-indigo-500/20 focus-visible:bg-white/10 transition-all outline-none text-xs"
                                />
                            </div>
                            <div className="space-y-2">
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

                    <DialogFooter className="pt-2 gap-3 sm:justify-between items-center sm:flex-row-reverse w-full">
                        <Button type="submit" disabled={isLoading} className="h-12 px-8 rounded-[1.2rem] bg-indigo-600 hover:bg-white hover:text-slate-950 text-white font-black text-[11px] uppercase tracking-[0.3em] shadow-active transition-all active:scale-95 disabled:opacity-20 italic flex items-center gap-3 border-none whitespace-nowrap order-last sm:order-first">
                            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {!isLoading && <ArrowRight className="h-4 w-4" />}
                            INICIAR CONVERSIÓN
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-10 px-5 rounded-xl text-slate-300 hover:text-rose-500 font-black italic uppercase tracking-[0.3em] text-[10px] transition-colors order-first sm:order-last">
                            ABORTAR
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
