"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { toast } from "sonner"
import { Loader2, FileCheck, Download, Search, User, Zap, TrendingUp, ArrowUpRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { legalReportService, CertificateData } from "../services/legalReportService"
import { pdfReportService } from "../services/pdfReportService"
import { Input } from "@/shared/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { cn } from "@/shared/lib/utils"

export function CertificateGenerator() {
    const [isLoading, setIsLoading] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [parties, setParties] = useState<any[]>([])
    const [selectedParty, setSelectedParty] = useState("")
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
    const [searchQuery, setSearchQuery] = useState("")
    const [previewData, setPreviewData] = useState<any[] | null>(null)
    const [isPreviewLoading, setIsPreviewLoading] = useState(false)
    const [annualRegistry, setAnnualRegistry] = useState<any[]>([])
    const [isRegistryLoading, setIsRegistryLoading] = useState(false)
    const [activeTab, setActiveTab] = useState("individual")

    useEffect(() => {
        loadParties()
    }, [])

    useEffect(() => {
        if (activeTab === "annual") {
            loadAnnualRegistry()
        }
    }, [activeTab, selectedYear])

    useEffect(() => {
        if (selectedParty) {
            loadPreview()
        } else {
            setPreviewData(null)
        }
    }, [selectedParty, selectedYear])

    const loadPreview = async () => {
        setIsPreviewLoading(true)
        try {
            const supabase = createClient()
            const startDate = `${selectedYear}-01-01`
            const endDate = `${selectedYear}-12-31`
            const data = await legalReportService.getWithholdingData(supabase, selectedParty, startDate, endDate)
            setPreviewData(data)
        } catch (error) {
            console.error("Error loading preview:", error)
        } finally {
            setIsPreviewLoading(false)
        }
    }

    const loadParties = async () => {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('parties')
            .select('id, legal_name, doc_number')
            .eq('is_vendor', true)
            .order('legal_name')
            .limit(100)

        if (error) {
            toast.error("Error al cargar terceros")
            return
        }
        setParties(data || [])
    }

    const loadAnnualRegistry = async () => {
        setIsRegistryLoading(true)
        try {
            const supabase = createClient()
            const data = await legalReportService.getAnnualWithholdingRegistry(supabase, parseInt(selectedYear))
            setAnnualRegistry(data)
        } catch (error) {
            toast.error("Error al cargar el resumen anual")
        } finally {
            setIsRegistryLoading(false)
        }
    }

    const handleGenerate = async () => {
        if (!selectedParty) {
            toast.error("Por favor seleccione un tercero")
            return
        }

        setIsGenerating(true)
        try {
            const supabase = createClient()
            const data = await legalReportService.getCertificateFullData(
                supabase,
                selectedParty,
                parseInt(selectedYear)
            )

            if (data.items.length === 0) {
                toast.warning("No se encontraron retenciones para este tercero en el periodo seleccionado")
                setIsGenerating(false)
                return
            }

            await pdfReportService.generateWithholdingCertificate(data)
            toast.success("Certificado generado con éxito")
        } catch (error: any) {
            toast.error("Error al generar el certificado: " + error.message)
        } finally {
            setIsGenerating(false)
        }
    }

    const filteredParties = parties.filter(p =>
        p.legal_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.doc_number.includes(searchQuery)
    )

    const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString())

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
            <div className="flex justify-center">
                <TabsList className="bg-slate-100 p-2 rounded-[2rem] h-auto border border-slate-200/50 shadow-inner">
                    <TabsTrigger
                        value="individual"
                        className="rounded-[1.5rem] px-8 py-4 data-[state=active]:bg-white data-[state=active]:shadow-premium data-[state=active]:text-primary font-black italic uppercase tracking-tighter text-xs"
                    >
                        Generación Individual
                    </TabsTrigger>
                    <TabsTrigger
                        value="annual"
                        className="rounded-[1.5rem] px-8 py-4 data-[state=active]:bg-white data-[state=active]:shadow-premium data-[state=active]:text-primary font-black italic uppercase tracking-tighter text-xs"
                    >
                        Resumen Anual Fiscal
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="individual" className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Control Panel */}
                    <Card className="border-none bg-white shadow-premium rounded-[3.5rem] overflow-hidden group">
                        <CardHeader className="p-10 border-b border-slate-50">
                            <div className="flex items-center gap-5">
                                <div className="h-14 w-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-active group-hover:rotate-6 transition-transform">
                                    <FileCheck className="h-7 w-7" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">Protocolo</CardTitle>
                                    <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 pt-1">Configuración de Emisión</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-10 space-y-8">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Año Gravable</Label>
                                <Select value={selectedYear} onValueChange={setSelectedYear}>
                                    <SelectTrigger className="h-14 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 rounded-2xl font-black italic text-slate-900 shadow-sm">
                                        <SelectValue placeholder="Seleccione año" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-none shadow-premium p-2">
                                        {years.map(y => (
                                            <SelectItem key={y} value={y} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">{y}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3 text-left">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Filtro de Tercero</Label>
                                <div className="relative">
                                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Nombre o NIT..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="h-14 pl-14 bg-slate-50 border-2 border-transparent focus:border-indigo-500/20 rounded-2xl font-bold placeholder:text-slate-300 placeholder:italic placeholder:font-black placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 text-left">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Directorio de Proveedores</Label>
                                <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                    {filteredParties.map((party) => (
                                        <button
                                            key={party.id}
                                            onClick={() => setSelectedParty(party.id)}
                                            className={cn(
                                                "w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all group/btn relative overflow-hidden",
                                                selectedParty === party.id
                                                    ? "bg-slate-900 border-slate-900 text-white shadow-active scale-[1.02]"
                                                    : "bg-white border-slate-100 hover:border-indigo-500/20 text-slate-600 hover:bg-slate-50"
                                            )}
                                        >
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
                                                    selectedParty === party.id ? "bg-indigo-500/20" : "bg-slate-100 group-hover/btn:bg-white"
                                                )}>
                                                    <User className={cn("h-5 w-5", selectedParty === party.id ? "text-indigo-400" : "text-slate-400")} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[11px] font-black uppercase leading-tight tracking-tighter italic">{party.legal_name}</p>
                                                    <p className={cn("text-[9px] font-bold opacity-60 mt-0.5", selectedParty === party.id ? "text-indigo-200" : "text-slate-400")}>
                                                        NIT: {party.doc_number}
                                                    </p>
                                                </div>
                                            </div>
                                            {selectedParty === party.id && (
                                                <div className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse relative z-10" />
                                            )}
                                        </button>
                                    ))}
                                    {filteredParties.length === 0 && (
                                        <div className="py-12 text-center space-y-4">
                                            <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto">
                                                <Search className="h-6 w-6 text-slate-200" />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 italic">Sin Resultados</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Button
                                onClick={handleGenerate}
                                disabled={isGenerating || !selectedParty}
                                className="w-full h-20 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black italic tracking-tighter text-xl shadow-active group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                {isGenerating ? (
                                    <Loader2 className="h-7 w-7 animate-spin mr-3" />
                                ) : (
                                    <span className="flex items-center gap-4">
                                        EMITIR CERTIFICADO <Download className="h-6 w-6 group-hover:translate-y-1 transition-transform" />
                                    </span>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Preview Area */}
                    <Card className="lg:col-span-2 border-none bg-slate-900 shadow-premium rounded-[3.5rem] overflow-hidden min-h-[600px] flex flex-col group/preview relative">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover/preview:scale-110 transition-transform duration-1000">
                            <FileCheck className="h-64 w-64 text-white" />
                        </div>

                        <CardHeader className="p-12 border-b border-white/5 bg-white/5 backdrop-blur-md relative z-10">
                            <div className="flex items-center gap-5">
                                <div className="h-14 w-14 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                                    <Search className="h-7 w-7" />
                                </div>
                                <div>
                                    <CardTitle className="text-white text-3xl font-black italic tracking-tighter uppercase leading-none">Previsualización</CardTitle>
                                    <CardDescription className="text-indigo-300/60 font-black uppercase tracking-widest text-[10px] pt-1">Estatuto Tributario Art. 381 Validado</CardDescription>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-12 pt-0 flex-1 flex flex-col relative z-10">
                            {selectedParty ? (
                                <div className="h-full flex flex-col py-10">
                                    {isPreviewLoading ? (
                                        <div className="flex-1 flex flex-col items-center justify-center animate-pulse">
                                            <div className="h-20 w-20 rounded-[2rem] bg-indigo-50/10 flex items-center justify-center mb-6">
                                                <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
                                            </div>
                                            <p className="text-slate-400 font-black italic uppercase tracking-[0.3em] text-[10px]">Consultando Libros Auxiliares...</p>
                                        </div>
                                    ) : previewData && previewData.length > 0 ? (
                                        <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
                                            <div className="bg-white/5 rounded-[2.5rem] p-10 border border-white/5 backdrop-blur-md">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="text-[10px] font-black uppercase text-slate-500 tracking-[0.5em] border-b border-white/10">
                                                            <th className="pb-8">Concepto de Retención</th>
                                                            <th className="pb-8 text-right">Base Gravable</th>
                                                            <th className="pb-8 text-center">Tarifa</th>
                                                            <th className="pb-8 text-right">Vr. Retenido</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-slate-300">
                                                        {previewData.map((item, idx) => (
                                                            <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group/row">
                                                                <td className="py-6 text-[12px] font-black italic uppercase tracking-tight group-hover/row:text-white">{item.account_name}</td>
                                                                <td className="py-6 text-[12px] text-right font-mono">${item.base_amount.toLocaleString('es-CO')}</td>
                                                                <td className="py-6 text-[12px] text-center">
                                                                    <span className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg font-black">{item.rate}%</span>
                                                                </td>
                                                                <td className="py-6 text-[12px] text-right font-black text-white italic">${item.tax_amount.toLocaleString('es-CO')}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr className="border-t-2 border-indigo-500/30">
                                                            <td colSpan={3} className="pt-10 text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] text-right">Consolidado Final a Certificar:</td>
                                                            <td className="pt-10 text-4xl font-black italic text-indigo-400 text-right leading-none">
                                                                ${previewData.reduce((sum, item) => sum + item.tax_amount, 0).toLocaleString('es-CO')}
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>

                                            <div className="grid grid-cols-2 gap-8">
                                                <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 flex items-center justify-between group/kpi">
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-2 italic">Índice de Registros</p>
                                                        <p className="text-2xl font-black text-white italic tracking-tighter">{previewData.length} CONCEPTOS</p>
                                                    </div>
                                                    <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover/kpi:bg-indigo-500 group-hover/kpi:text-white transition-all">
                                                        <TrendingUp className="h-6 w-6" />
                                                    </div>
                                                </div>
                                                <div className="p-8 rounded-[2rem] bg-indigo-600 shadow-active flex items-center justify-between group/kpi">
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase text-indigo-200 tracking-widest mb-2 italic">Estado de Cumplimiento</p>
                                                        <p className="text-2xl font-black text-white italic tracking-tighter uppercase">Validado IA</p>
                                                    </div>
                                                    <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center text-white">
                                                        <User className="h-6 w-6" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                                            <div className="h-24 w-24 rounded-[2.5rem] bg-white/5 flex items-center justify-center mb-8 border border-white/10">
                                                <Search className="h-10 w-10 text-slate-600" />
                                            </div>
                                            <h4 className="text-2xl font-black italic text-white uppercase tracking-tighter mb-3">Sin Historial de Retenciones</h4>
                                            <p className="text-xs text-slate-500 max-w-[320px] font-medium leading-relaxed uppercase tracking-widest">
                                                No se detectaron flujos gravables para este tercero en el periodo fiscal {selectedYear}.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto py-20 text-center space-y-12">
                                    <div className="relative">
                                        <div className="h-32 w-32 rounded-[3.5rem] bg-indigo-500/5 flex items-center justify-center mx-auto border border-indigo-500/10 animate-pulse">
                                            <FileCheck className="h-16 w-16 text-indigo-400/30" />
                                        </div>
                                        <div className="absolute -top-4 -right-4 h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-active rotate-12">
                                            <Zap className="h-6 w-6" />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-3xl font-black italic text-white uppercase tracking-tighter leading-none">Esperando Selección</h3>
                                        <p className="text-sm text-slate-400 leading-relaxed font-bold">
                                            El sistema requiere un identificador de tercero para compilar el <span className="text-indigo-400">Libro Auxiliar de Retenciones</span> y validar la base gravable {selectedYear}.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 w-full">
                                        <div className="p-6 rounded-[2rem] bg-white/5 text-left border border-white/5 hover:bg-white/[0.08] transition-colors">
                                            <p className="text-[8px] font-black uppercase text-indigo-400 tracking-widest mb-1 italic">Articulación Legal</p>
                                            <p className="text-[10px] text-slate-300 font-black uppercase tracking-tight">Art. 381 E.T. Validado</p>
                                        </div>
                                        <div className="p-6 rounded-[2rem] bg-white/5 text-left border border-white/5 hover:bg-white/[0.08] transition-colors">
                                            <p className="text-[8px] font-black uppercase text-emerald-400 tracking-widest mb-1 italic">Seguridad Fiscal</p>
                                            <p className="text-[10px] text-slate-300 font-black uppercase tracking-tight">Cálculo Determinístico</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            <TabsContent value="annual" className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
                <Card className="border-none bg-white shadow-premium rounded-[4rem] overflow-hidden group">
                    <CardHeader className="p-12 md:p-16 border-b border-slate-50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                            <TrendingUp className="h-48 w-48" />
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 relative z-10">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-2 w-8 bg-indigo-500 rounded-full" />
                                    <CardTitle className="text-3xl md:text-5xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">
                                        Libro <span className="text-slate-400">Anual</span>
                                    </CardTitle>
                                </div>
                                <CardDescription className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">
                                    Consolidado determinístico de retenciones practicadas ({selectedYear})
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-6 bg-slate-50 p-4 rounded-3xl border border-slate-100 shadow-inner">
                                <div className="text-right">
                                    <Label className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">Periodo Fiscal</Label>
                                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                                        <SelectTrigger className="h-12 w-32 bg-white border-2 border-transparent focus:border-indigo-500/20 rounded-2xl font-black italic text-slate-900 text-lg shadow-sm">
                                            <SelectValue placeholder="Año" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-none shadow-premium">
                                            {years.map(y => (
                                                <SelectItem key={y} value={y} className="font-bold">{y}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {isRegistryLoading ? (
                            <div className="flex flex-col items-center justify-center py-40 animate-pulse">
                                <div className="h-20 w-20 rounded-[2.5rem] bg-indigo-50 flex items-center justify-center mb-8 border border-white shadow-premium">
                                    <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
                                </div>
                                <p className="text-slate-400 font-black italic uppercase tracking-[0.4em] text-[10px]">Auditando Historial Fiscal...</p>
                            </div>
                        ) : annualRegistry.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-900">
                                        <TableRow className="border-none hover:bg-slate-900">
                                            <TableHead className="h-20 px-10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-r border-white/5">Identificación</TableHead>
                                            <TableHead className="h-20 px-10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Razón Social / Tercero</TableHead>
                                            <TableHead className="h-20 px-10 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Conceptos</TableHead>
                                            <TableHead className="h-20 px-10 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Base Gravable Total</TableHead>
                                            <TableHead className="h-20 px-10 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-white/5">Valor Retenido</TableHead>
                                            <TableHead className="h-20 px-10 w-24"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {annualRegistry.map((reg) => (
                                            <TableRow key={reg.party_id} className="border-slate-50 hover:bg-slate-50/80 group transition-all">
                                                <TableCell className="px-10 py-8 font-mono text-xs text-slate-400 border-r border-slate-100">{reg.doc_number}</TableCell>
                                                <TableCell className="px-10 py-8">
                                                    <p className="font-black italic text-slate-900 uppercase tracking-tighter text-base group-hover:text-indigo-600 transition-colors">{reg.legal_name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Proveedor Homologado</p>
                                                </TableCell>
                                                <TableCell className="px-10 py-8 text-center">
                                                    <span className="inline-flex items-center justify-center px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[11px] font-black italic shadow-sm">
                                                        {reg.concept_count} <Zap className="h-3 w-3 ml-2" />
                                                    </span>
                                                </TableCell>
                                                <TableCell className="px-10 py-8 text-right font-mono text-sm text-slate-400 italic">
                                                    ${reg.total_base.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                                                </TableCell>
                                                <TableCell className="px-10 py-8 text-right bg-slate-50/30">
                                                    <p className="text-xl font-black italic text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                        ${reg.total_tax.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                                                    </p>
                                                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1">Certificable</p>
                                                </TableCell>
                                                <TableCell className="px-10 py-8 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-12 w-12 rounded-2xl p-0 hover:bg-slate-900 hover:text-white shadow-sm hover:shadow-active transition-all"
                                                        onClick={() => {
                                                            setSelectedParty(reg.party_id);
                                                            setActiveTab("individual");
                                                        }}
                                                    >
                                                        <ArrowUpRight className="h-6 w-6" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                    <tfoot>
                                        <TableRow className="bg-slate-900 border-none">
                                            <TableCell colSpan={4} className="px-10 py-10 text-right text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">Gran Consolidado Anual:</TableCell>
                                            <TableCell className="px-10 py-10 text-right bg-white/10">
                                                <p className="text-3xl font-black italic text-white leading-none">
                                                    ${annualRegistry.reduce((sum, reg) => sum + reg.total_tax, 0).toLocaleString('es-CO')}
                                                </p>
                                            </TableCell>
                                            <TableCell className="px-10 py-10"></TableCell>
                                        </TableRow>
                                    </tfoot>
                                </Table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-40 text-center space-y-8">
                                <div className="h-24 w-24 rounded-[2.5rem] bg-slate-50 flex items-center justify-center border border-slate-100 animate-bounce-subtle">
                                    <FileCheck className="h-10 w-10 text-slate-200" />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">Sin Retenciones Detectadas</h4>
                                    <p className="text-sm text-slate-400 max-w-sm mx-auto font-medium">El motor fiscal no encontró operaciones gravables en el periodo {selectedYear}.</p>
                                </div>
                                <Button className="bg-slate-900 text-white rounded-2xl h-12 px-8 font-black italic uppercase tracking-tighter text-xs" onClick={loadAnnualRegistry}>
                                    Re-Sincronizar Periodo
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    )
}
