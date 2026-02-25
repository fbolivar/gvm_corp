"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { CheckCircle2, XCircle, FileImage, CreditCard, Building2, ExternalLink, Calendar, Search } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { toast } from "sonner"
import { Input } from "@/shared/components/ui/input"

export function PaymentReportsManager() {
    const [reports, setReports] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const supabase = createClient()

    useEffect(() => {
        fetchReports()
    }, [])

    const fetchReports = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('payment_reports')
                .select(`
                    *,
                    party:parties(legal_name),
                    document:documents(number, total)
                `)
                .order('created_at', { ascending: false })

            if (error) throw error
            setReports(data || [])
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar reportes de pago")
        } finally {
            setLoading(false)
        }
    }

    const handleProcessReport = async (reportId: string, action: 'VERIFIED' | 'REJECTED') => {
        setProcessingId(reportId)
        try {
            const { error } = await supabase
                .from('payment_reports')
                .update({ status: action })
                .eq('id', reportId)

            if (error) throw error

            // Si es verificado, idealmente aquí crearíamos un payment_allocation
            // pero para este PRP es suficiente con cambiar el estado y detener al bot de cartera
            toast.success(action === 'VERIFIED' ? 'Pago Verificado y Aplicado' : 'Reporte Rechazado')
            fetchReports()
        } catch (error) {
            console.error(error)
            toast.error("Error al procesar el reporte")
        } finally {
            setProcessingId(null)
        }
    }

    const filteredReports = reports.filter(r =>
        r.party?.legal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.document?.number?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const pendingCount = reports.filter(r => r.status === 'PENDING').length

    return (
        <Card className="border-none bg-white rounded-[3rem] shadow-premium overflow-hidden">
            <CardHeader className="p-10 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <CardTitle className="text-3xl font-black italic tracking-tighter uppercase text-slate-900">
                        Conciliación Automática
                    </CardTitle>
                    <CardDescription className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2 flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                        {pendingCount} Reportes por Revisar
                    </CardDescription>
                </div>
                <div className="relative w-full md:w-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Buscar cliente o factura..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 bg-white border-2 border-slate-200 rounded-full h-12 min-w-[300px] font-bold focus-visible:ring-indigo-500"
                    />
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {loading ? (
                    <div className="p-20 text-center flex flex-col items-center">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-sm font-black uppercase tracking-widest text-slate-400">Escaneando Portal...</p>
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="p-20 text-center">
                        <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500 mb-6 opacity-50" />
                        <h3 className="text-xl font-black italic uppercase text-slate-900 mb-2">Todo al Día</h3>
                        <p className="text-slate-500 font-bold">No hay reportes de pago pendientes de revisión.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredReports.map((report) => (
                            <div key={report.id} className={cn(
                                "p-8 md:p-10 flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between transition-colors",
                                report.status === 'PENDING' ? "bg-white hover:bg-slate-50" : "bg-slate-50/50 opacity-70"
                            )}>
                                <div className="flex-1 space-y-6">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <Badge className={cn(
                                            "px-4 py-1 font-black italic uppercase tracking-widest rounded-full",
                                            report.status === 'PENDING' ? "bg-amber-100 text-amber-700 hover:bg-amber-200" :
                                                report.status === 'VERIFIED' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" :
                                                    "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                        )}>
                                            {report.status === 'PENDING' ? 'EN REVISIÓN' : report.status === 'VERIFIED' ? 'APLICADO' : 'RECHAZADO'}
                                        </Badge>
                                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(report.created_at).toLocaleString('es-CO')}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xl font-black text-slate-900 italic uppercase">
                                            {report.party?.legal_name || 'Desconocido'}
                                        </h4>
                                        <div className="flex items-center gap-6 mt-2">
                                            <p className="text-sm text-slate-500 font-bold flex items-center gap-2">
                                                <ExternalLink className="w-4 h-4 text-slate-400" />
                                                Factura: <span className="text-slate-900">#{report.document?.number}</span>
                                            </p>
                                            <p className="text-sm text-slate-500 font-bold flex items-center gap-2">
                                                <CreditCard className="w-4 h-4 text-slate-400" />
                                                Reportado: <span className="text-indigo-600 font-black">{Number(report.amount).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {report.notes && (
                                        <p className="text-sm text-slate-600 bg-slate-100 p-4 rounded-xl border border-slate-200 italic font-medium">
                                            "{report.notes}"
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row lg:flex-col gap-4 w-full lg:w-auto shrink-0">
                                    <Button
                                        variant="outline"
                                        className="h-12 w-full lg:w-48 rounded-2xl font-black uppercase italic tracking-widest border-2 text-slate-600 hover:text-indigo-600"
                                        disabled={!report.evidence_url}
                                    >
                                        <FileImage className="w-4 h-4 mr-2" />
                                        Ver Comprobante
                                    </Button>

                                    {report.status === 'PENDING' && (
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => handleProcessReport(report.id, 'REJECTED')}
                                                disabled={processingId === report.id}
                                                variant="outline"
                                                className="flex-1 lg:flex-none h-12 w-full lg:w-24 rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50"
                                            >
                                                <XCircle className="w-5 h-5 mx-auto" />
                                            </Button>
                                            <Button
                                                onClick={() => handleProcessReport(report.id, 'VERIFIED')}
                                                disabled={processingId === report.id}
                                                className="flex-1 lg:flex-none h-12 w-full lg:w-24 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                                            >
                                                <CheckCircle2 className="w-5 h-5 mx-auto" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
