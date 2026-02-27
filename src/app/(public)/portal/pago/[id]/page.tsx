"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Badge } from "@/shared/components/ui/badge"
import { Brain, FileText, CheckCircle2, UploadCloud, AlertCircle, Building2, Calendar, DollarSign, ArrowRight, Bot } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { toast } from "sonner"

export default function DebtorPortalPage() {
    const { id: documentId } = useParams()
    const [document, setDocument] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [reportData, setReportData] = useState({
        amount: "",
        notes: ""
    })
    const supabase = createClient()

    useEffect(() => {
        fetchDocumentInfo()
    }, [documentId])

    const fetchDocumentInfo = async () => {
        try {
            // Priority: Use the RPC for SECURITY DEFINER access
            const { data: rpcData, error: rpcError } = await supabase
                .rpc('get_portal_invoice', { doc_id: documentId })
                .single()

            let invoiceData: any = null;

            if (rpcError) {
                console.warn("RPC failed, attempting direct fetch (Check RLS policies):", rpcError.message);

                // Fallback: Direct fetch
                const { data: directData, error: directError } = await supabase
                    .from('documents')
                    .select('id, number, total, due_date, issue_date, status, party_id, tenant_id, tenant:tenants(name), party:parties(legal_name)')
                    .eq('id', documentId)
                    .single();

                if (directError) {
                    console.error("Critical: Both RPC and Direct fetch failed", directError);
                    throw rpcError; // Propagate the original RPC error for context
                }

                // Map direct data to expected structure
                const d = directData as any;
                invoiceData = {
                    id: d.id,
                    number: d.number,
                    total: d.total,
                    due_date: d.due_date,
                    status: d.status,
                    party_id: d.party_id,
                    tenant_id: d.tenant_id,
                    tenant_name: d.tenant?.name,
                    party_name: d.party?.legal_name
                };
            } else {
                invoiceData = rpcData;
            }

            if (!invoiceData) throw new Error("Factura no encontrada");

            setDocument({
                id: invoiceData.id,
                number: invoiceData.number,
                total: invoiceData.total,
                due_date: invoiceData.due_date || invoiceData.issue_date,
                status: invoiceData.status,
                party_id: invoiceData.party_id,
                tenant_id: invoiceData.tenant_id,
                tenant: { name: invoiceData.tenant_name || invoiceData.tenant?.name },
                party: { legal_name: invoiceData.party_name || invoiceData.party?.legal_name }
            })
            setReportData(prev => ({ ...prev, amount: (invoiceData.total || 0).toString() }))
        } catch (error) {
            console.error(error)
            toast.error("No se pudo cargar la información de la factura")
        } finally {
            setLoading(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                toast.error("El archivo excede el límite de 5MB");
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleSubmitReport = async () => {
        if (!reportData.amount) {
            toast.error("El monto es obligatorio");
            return;
        }
        if (!selectedFile) {
            toast.error("Debe adjuntar el comprobante de pago");
            return;
        }

        setUploading(true);
        try {
            // 1. Upload File to Storage
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${document.id}-${Date.now()}.${fileExt}`;
            const filePath = `${document.tenant_id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('payment-receipts')
                .upload(filePath, selectedFile, { upsert: true });

            let evidenceUrl = '';
            if (!uploadError) {
                const { data: publicUrlData } = supabase.storage
                    .from('payment-receipts')
                    .getPublicUrl(filePath);
                evidenceUrl = publicUrlData.publicUrl;
            } else {
                console.warn("Storage upload warning (Bucket may not exist, will save without file):", uploadError);
                // Si falla el storage lo dejamos enviar sin el archivo para efectos del demo/MVP
            }

            // 2. Insert Record
            const { error: insertError } = await supabase
                .from('payment_reports')
                .insert({
                    tenant_id: document.tenant_id,
                    document_id: document.id,
                    party_id: document.party_id,
                    amount: parseFloat(reportData.amount),
                    notes: reportData.notes,
                    evidence_url: evidenceUrl,
                    status: 'PENDING'
                });

            if (insertError) {
                // Si la tabla no existe por falta de migraciones
                if (insertError.code === '42P01') {
                    toast.error("Error: La tabla 'payment_reports' no ha sido creada en la base de datos.");
                    return;
                }
                throw insertError;
            }

            toast.success("REPORTE ENVIADO", {
                description: "Nuestro equipo de cartera validará la información en breve."
            });

            // Limpiar formulario
            setReportData({ amount: "", notes: "" });
            setSelectedFile(null);

        } catch (error) {
            console.error(error);
            toast.error("Error crítico al enviar el reporte");
        } finally {
            setUploading(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-white font-black uppercase tracking-[0.3em] italic animate-pulse">Sincronizando con Portfolio IQ...</p>
                </div>
            </div>
        )
    }

    if (!document) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8 text-center">
                <Card className="max-w-md border-none bg-slate-900 shadow-2xl rounded-[3rem] p-12">
                    <AlertCircle className="w-20 h-20 text-rose-500 mx-auto mb-8" />
                    <h1 className="text-2xl font-black text-white italic uppercase mb-4 tracking-tighter">Acceso no autorizado</h1>
                    <p className="text-slate-400 font-bold mb-10">La factura solicitada no existe o el enlace ha expirado.</p>
                    <Button className="w-full h-16 rounded-full bg-white text-black font-black uppercase italic tracking-widest hover:bg-slate-200">
                        Contactar Soporte
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12 px-6 md:py-24">
            <div className="max-w-5xl mx-auto space-y-12">
                {/* Header Branding */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-indigo-600 rounded-3xl rotate-6 shadow-2xl">
                            <Bot className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black text-white italic uppercase tracking-tighter leading-none">
                                Centro de Pagos
                            </h1>
                            <p className="text-indigo-400 font-black uppercase tracking-[0.4em] text-xs mt-2">
                                Powered by Portfolio IQ Agent
                            </p>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-[2rem] flex items-center gap-4">
                        <Building2 className="w-6 h-6 text-slate-400" />
                        <span className="text-white font-black italic uppercase tracking-widest">{document.tenant?.name}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Invoice Info Card */}
                    <Card className="border-none bg-white rounded-[3rem] shadow-premium overflow-hidden">
                        <CardHeader className="p-10 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Badge className="mb-4 bg-slate-900 text-white font-black italic rounded-full px-4">FACTURA #{document.number}</Badge>
                                    <CardTitle className="text-4xl font-black text-slate-900 italic tracking-tighter uppercase">Resumen de Cuenta</CardTitle>
                                </div>
                                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                                    <FileText className="w-8 h-8" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-10 space-y-10">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total a Pagar</p>
                                    <p className="text-3xl font-black italic text-slate-900">
                                        {document.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha de Vencimiento</p>
                                    <p className="text-xl font-black italic text-slate-600 uppercase">
                                        {new Date(document.due_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>

                            <div className="p-8 bg-slate-900 rounded-[2rem] text-white space-y-4">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-black italic uppercase text-sm tracking-widest">Instrucciones de Pago</h3>
                                    <div className="h-[2px] flex-1 bg-slate-800" />
                                </div>
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-3 text-xs font-bold text-slate-400">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        Transferencia Bancaria a cuenta corriente Bancolombia
                                    </li>
                                    <li className="flex items-center gap-3 text-xs font-bold text-slate-400">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        Reporta tu pago adjuntando el comprobante a la derecha
                                    </li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Report Form Card */}
                    <Card className="border-none bg-indigo-600 rounded-[3rem] shadow-premium text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-150 transition-transform duration-700">
                            <UploadCloud className="w-32 h-32" />
                        </div>

                        <CardHeader className="p-10 pb-0">
                            <CardTitle className="text-3xl font-black italic tracking-tighter uppercase">Reportar Pago</CardTitle>
                            <CardDescription className="text-indigo-100 font-bold opacity-80 uppercase text-xs tracking-widest">
                                Reporta tu consignación para conciliación inmediata
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="p-10 space-y-8">
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Valor Consignado (COP)</Label>
                                <Input
                                    type="number"
                                    value={reportData.amount}
                                    onChange={(e) => setReportData({ ...reportData, amount: e.target.value })}
                                    className="h-16 bg-white/10 border-none rounded-2xl text-2xl font-black italic text-white placeholder:text-indigo-300/50 focus-visible:ring-indigo-400"
                                />
                            </div>

                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Notas Adicionales</Label>
                                <Input
                                    placeholder="Ej: Pago parcial, Número de referencia..."
                                    value={reportData.notes}
                                    onChange={(e) => setReportData({ ...reportData, notes: e.target.value })}
                                    className="h-14 bg-white/10 border-none rounded-2xl font-bold italic text-white placeholder:text-indigo-300/50 focus-visible:ring-indigo-400"
                                />
                            </div>

                            <Label className="cursor-pointer">
                                <Input type="file" className="hidden" accept="image/png,image/jpeg,application/pdf" onChange={handleFileChange} />
                                <div className={cn(
                                    "p-12 border-4 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all hover:bg-white/5",
                                    selectedFile ? "border-emerald-400/50 bg-emerald-500/10" : "border-indigo-400/50"
                                )}>
                                    {selectedFile ? <CheckCircle2 className="w-10 h-10 text-emerald-400 group-hover:scale-110 transition-transform" /> : <UploadCloud className="w-10 h-10 group-hover:-translate-y-2 transition-transform" />}
                                    <div className="text-center">
                                        <p className="text-sm font-black italic uppercase tracking-tight">
                                            {selectedFile ? "Comprobante Adjuntado" : "Cargar Comprobante"}
                                        </p>
                                        <p className="text-[10px] font-bold opacity-60">
                                            {selectedFile ? selectedFile.name : "PNG, JPG o PDF (Máx 5MB)"}
                                        </p>
                                    </div>
                                </div>
                            </Label>

                            <Button
                                onClick={handleSubmitReport}
                                disabled={uploading}
                                className="w-full h-20 rounded-full bg-slate-950 hover:bg-black text-white font-black uppercase italic tracking-[0.3em] shadow-2xl transition-all hover:scale-105 active:scale-95"
                            >
                                {uploading ? "PROCESANDO..." : (
                                    <>
                                        ENVIAR REPORTE MAESTRO
                                        <ArrowRight className="w-6 h-6 ml-4" />
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="text-center">
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em]">
                        &copy; 2026 GVM ERP INTEGRAL — AGENTE DE COBRANZA AI
                    </p>
                </div>
            </div>
        </div>
    )
}
