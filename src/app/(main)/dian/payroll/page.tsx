"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import {
    Loader2,
    ChevronLeft,
    ShieldCheck,
    FileText,
    ExternalLink,
    Search,
    Download,
    Eye
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/shared/components/ui/dialog"
import { PaymentSlip } from "@/features/payroll/components/PaymentSlip"

export default function DianPayrollDashboard() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [documents, setDocuments] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedDoc, setSelectedDoc] = useState<any>(null)
    const [isSlipOpen, setIsSlipOpen] = useState(false)

    useEffect(() => {
        async function loadElectronicPayroll() {
            try {
                const { data, error } = await supabase
                    .from('electronic_documents')
                    .select(`
                        *,
                        document:documents (
                            id,
                            number,
                            issue_date,
                            total,
                            doc_type,
                            lines:document_lines(*),
                            party:parties (
                                id,
                                legal_name,
                                doc_number,
                                email,
                                phone
                            )
                        )
                    `)
                    .order('sent_at', { ascending: false });

                if (error) throw error;

                // Fetch employee data for each party
                const payrollDocs = data.filter((d: { document?: { doc_type: string } }) => d.document?.doc_type === 'PAYROLL');

                const docsWithEmployee = await Promise.all(payrollDocs.map(async (doc: any) => {
                    const { data: emp } = await supabase
                        .from('employees')
                        .select('*')
                        .eq('party_id', doc.document.party.id)
                        .single();
                    return { ...doc, employee: { ...emp, party: doc.document.party } };
                }));

                setDocuments(docsWithEmployee);
            } catch (err) {
                console.error(err)
                toast.error("Error al cargar documentos electrónicos")
            } finally {
                setLoading(false)
            }
        }
        loadElectronicPayroll()
    }, [supabase])

    const handleViewSlip = (doc: any) => {
        setSelectedDoc(doc);
        setIsSlipOpen(true);
    };

    const filteredDocs = documents.filter(d =>
        d.document.party.legal_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.document.number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consultando registros DIAN...</p>
            </div>
        )
    }

    return (
        <div className="p-10 space-y-10 max-w-[1400px] mx-auto animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <Link href="/payroll" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors mb-4">
                        <ChevronLeft className="h-4 w-4" /> Volver a Nómina
                    </Link>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic">
                        DIAN <span className="text-emerald-600">Nómina Electrónica</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Estado de transmisiones electrónicas y cumplimiento</p>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-[2rem] shadow-premium border border-slate-100">
                    <Search className="h-4 w-4 text-slate-400 ml-4" />
                    <input
                        type="text"
                        placeholder="Buscar por colaborador..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-900 placeholder:text-slate-300 w-64"
                    />
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="border-none shadow-premium bg-emerald-50/50 rounded-[2.5rem] p-4 group">
                    <CardContent className="p-6 flex items-center gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-emerald-600">
                            <ShieldCheck className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Aceptados DIAN</p>
                            <h3 className="text-3xl font-black text-slate-900 italic tracking-tighter">{documents.length}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-premium bg-slate-900 rounded-[2.5rem] p-4 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <CardContent className="p-6 flex items-center gap-6 relative z-10">
                        <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                            <FileText className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Total Transmitido</p>
                            <h3 className="text-3xl font-black text-white italic tracking-tighter">
                                ${new Intl.NumberFormat('es-CO').format(documents.reduce((sum, d) => sum + d.document.total, 0))}
                            </h3>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-premium bg-indigo-50/50 rounded-[2.5rem] p-4 group">
                    <CardContent className="p-6 flex items-center gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600">
                            <ExternalLink className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Ambiente</p>
                            <h3 className="text-3xl font-black text-slate-900 italic tracking-tighter">Producción</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Document List */}
            <Card className="border-none shadow-premium bg-white rounded-[3rem] overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-50">
                                <tr>
                                    <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento / Empleado</th>
                                    <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Envío</th>
                                    <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">CUNE / Identificador</th>
                                    <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                                    <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Monto</th>
                                    <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 italic">
                                {filteredDocs.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-slate-50/30 transition-colors group">
                                        <td className="p-8">
                                            <p className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">{doc.document.number}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{doc.document.party.legal_name}</p>
                                        </td>
                                        <td className="p-8">
                                            <p className="text-xs font-bold text-slate-600">
                                                {doc.sent_at ? format(new Date(doc.sent_at), "MMM d, yyyy HH:mm", { locale: es }) : '---'}
                                            </p>
                                        </td>
                                        <td className="p-8">
                                            <div className="flex items-center gap-2 max-w-[150px]">
                                                <code className="text-[10px] font-bold text-slate-400 truncate bg-slate-100 p-1 px-2 rounded-lg">
                                                    {doc.cufe}
                                                </code>
                                            </div>
                                        </td>
                                        <td className="p-8 text-center">
                                            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100/50 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                {doc.dian_status}
                                            </span>
                                        </td>
                                        <td className="p-8 text-right font-black text-slate-900">
                                            ${new Intl.NumberFormat('es-CO').format(doc.document.total)}
                                        </td>
                                        <td className="p-8 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-sm" title="Ver XML">
                                                    <FileText className="h-4 w-4 text-indigo-600" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-sm"
                                                    title="Ver Desprendible"
                                                    onClick={() => handleViewSlip(doc)}
                                                >
                                                    <Eye className="h-4 w-4 text-slate-600" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-sm" title="Descargar PDF">
                                                    <Download className="h-4 w-4 text-rose-600" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredDocs.length === 0 && (
                            <div className="py-40 text-center space-y-4">
                                <FileText className="h-12 w-12 text-slate-200 mx-auto" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No se encontraron transmisiones electrónicas</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-center gap-6 p-10 bg-indigo-900 rounded-[3rem] text-white relative overflow-hidden group">
                <ShieldCheck className="h-12 w-12 text-indigo-400 shrink-0" />
                <div className="space-y-1 relative z-10">
                    <h4 className="text-lg font-black italic tracking-tight">Garantía de Cumplimiento Legal</h4>
                    <p className="text-xs font-bold text-indigo-300 italic">Cada documento listado aquí ha sido validado ante el ambiente de producción de la DIAN mediante protocolos SOAP y UBL 2.1.</p>
                </div>
                <ExternalLink className="absolute -bottom-10 -right-10 h-60 w-60 text-white/5 group-hover:scale-110 transition-transform duration-1000" />
            </div>

            <Dialog open={isSlipOpen} onOpenChange={setIsSlipOpen}>
                <DialogContent className="max-w-5xl bg-transparent border-none shadow-none p-0 overflow-visible">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Desprendible de Pago</DialogTitle>
                    </DialogHeader>
                    {selectedDoc && (
                        <PaymentSlip
                            document={selectedDoc.document}
                            employee={selectedDoc.employee}
                            cune={selectedDoc.cufe}
                            qrData={selectedDoc.qr_data}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
