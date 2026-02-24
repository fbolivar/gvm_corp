"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Checkbox } from "@/shared/components/ui/checkbox"
import {
    Download,
    Landmark,
    Users,
    Calendar,
    CheckCircle2,
    AlertCircle,
    FileText,
    ArrowRight,
    Loader2,
    Search,
    Filter,
    ArrowLeft
} from "lucide-react"
import { toast } from "sonner"
import { bankService } from "../services/bankService"
import { cn } from "@/shared/lib/utils"
import Link from "next/link"

interface SettlementRecord {
    id: string;
    issue_date: string;
    total: number;
    status: string;
    notes_public: string;
    party: {
        legal_name: string;
        doc_type: string;
        doc_number: string;
    };
    employee: {
        id: string;
        bank_name: string;
        bank_account_type: string;
        bank_account_number: string;
    };
}

export function PayrollDispersionHub() {
    const supabase = createClient()
    const [settlements, setSettlements] = useState<SettlementRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [processing, setProcessing] = useState(false)
    const [stats, setStats] = useState({ totalAmount: 0, count: 0 })

    useEffect(() => {
        async function fetchSettlements() {
            setLoading(true)
            try {
                // Fetch documents of type PAYROLL joined with party and employee bank data
                const { data, error } = await supabase
                    .from('documents')
                    .select(`
                        id,
                        issue_date,
                        total,
                        status,
                        notes_public,
                        party:parties(legal_name, doc_type, doc_number),
                        employee:employees(id, bank_name, bank_account_type, bank_account_number)
                    `)
                    .eq('doc_type', 'PAYROLL')
                    .order('issue_date', { ascending: false });

                if (error) throw error;

                // Map data to ensure it fits our interface (nested table structure from supabase)
                const formatted = (data || []).map((d: any) => ({
                    ...d,
                    employee: Array.isArray(d.employee) ? d.employee[0] : d.employee
                })) as SettlementRecord[];

                setSettlements(formatted)
            } catch (err) {
                console.error(err)
                toast.error("Error al cargar liquidaciones")
            } finally {
                setLoading(false)
            }
        }

        fetchSettlements()
    }, [supabase])

    useEffect(() => {
        const selected = settlements.filter(s => selectedIds.includes(s.id));
        const total = selected.reduce((sum, s) => sum + Number(s.total), 0);
        setStats({ totalAmount: total, count: selected.length });
    }, [selectedIds, settlements]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === settlements.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(settlements.map(s => s.id));
        }
    }

    const handleGenerate = (bank: 'BANCOLOMBIA' | 'DAVIVIENDA' | 'GENERIC') => {
        if (selectedIds.length === 0) {
            toast.error("Seleccione al menos una liquidación");
            return;
        }

        setProcessing(true);
        try {
            const selected = settlements
                .filter(s => selectedIds.includes(s.id))
                .map(s => ({
                    net_pay: s.total,
                    period_end: s.issue_date,
                    employee: {
                        ...s.employee,
                        party: s.party
                    }
                } as any));

            let content = "";
            let filename = `dispersion_${bank.toLowerCase()}_${new Date().getTime()}`;

            if (bank === 'BANCOLOMBIA') {
                content = bankService.generateBancolombiaPAB(selected, "00012345678"); // Example account
                filename += ".txt";
            } else if (bank === 'DAVIVIENDA') {
                content = bankService.generateDaviviendaTXT(selected, "900987654"); // Example NIT
                filename += ".txt";
            } else {
                content = bankService.generateDispersionFile(selected);
                filename += ".csv";
            }

            bankService.downloadFile(content, filename);
            toast.success(`Archivo para ${bank} generado con éxito`);
        } catch (err) {
            console.error(err);
            toast.error("Error al generar archivo");
        } finally {
            setProcessing(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-6">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 italic">Escaneando Registro de Pagos...</p>
            </div>
        )
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* 🛡️ TOP NAVIGATION */}
            <div className="flex items-center justify-between">
                <Button asChild variant="ghost" className="h-12 px-6 rounded-2xl group hover:bg-slate-50 transition-all">
                    <Link href="/payroll" className="flex items-center gap-3">
                        <ArrowLeft className="h-5 w-5 text-slate-400 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Volver a Nómina</span>
                    </Link>
                </Button>
                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-premium border border-slate-50">
                    <div className="h-4 w-4 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Radar de Dispersión Activo</span>
                </div>
            </div>

            {/* 🏭 INDUSTRIAL HEADER */}
            <div className="relative group overflow-hidden bg-slate-950 rounded-[4rem] p-16 text-white shadow-active">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                    <Landmark className="h-64 w-64 text-white" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-12 bg-indigo-500 rounded-full" />
                            <span className="text-xs font-black uppercase tracking-[0.5em] text-indigo-500 italic">Dispersión Bancaria Masiva</span>
                        </div>
                        <h1 className="text-6xl font-black tracking-tighter italic uppercase leading-[0.8]">
                            Central de <br /><span className="text-slate-500 text-5xl">Pagos Electrónicos</span>
                        </h1>
                        <p className="text-white/30 font-black text-[10px] uppercase tracking-[0.4em] italic">Generación de archivos planos multi-banco (PAB/TXT)</p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-md rounded-[2.5rem] p-10 border border-white/10 flex flex-col gap-6 shadow-active min-w-[320px]">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/40 italic">
                            <span>Monto Total Seleccionado</span>
                            <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/5 px-3 py-1 font-black italic">
                                {stats.count} REGISTROS
                            </Badge>
                        </div>
                        <div className="flex items-baseline gap-3">
                            <span className="text-4xl font-black text-white italic tracking-tighter">
                                ${new Intl.NumberFormat('es-CO').format(stats.totalAmount)}
                            </span>
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest italic">COP</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            <Button
                                onClick={() => handleGenerate('BANCOLOMBIA')}
                                disabled={selectedIds.length === 0 || processing}
                                className="h-14 bg-indigo-600 hover:bg-white hover:text-indigo-950 text-white font-black text-[10px] uppercase tracking-widest italic flex flex-col items-center justify-center rounded-2xl transition-all shadow-lg active:scale-95 gap-1"
                            >
                                <Landmark className="h-4 w-4" />
                                BANCOLOMBIA
                            </Button>
                            <Button
                                onClick={() => handleGenerate('DAVIVIENDA')}
                                disabled={selectedIds.length === 0 || processing}
                                className="h-14 bg-slate-800 hover:bg-white hover:text-slate-950 text-white font-black text-[10px] uppercase tracking-widest italic flex flex-col items-center justify-center rounded-2xl transition-all shadow-lg active:scale-95 gap-1"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                DAVIVIENDA
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 📋 SETTLEMENT LIST */}
            <Card className="border-none shadow-premium rounded-[3rem] bg-white overflow-hidden group">
                <CardHeader className="p-10 border-b border-slate-50 bg-slate-50/20">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-black text-slate-900 tracking-tight italic">Liquidaciones Listas para Pago</CardTitle>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic leading-tight">Módulo de extracción de flujo de caja</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                onClick={toggleSelectAll}
                                className="h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:border-indigo-500/30 transition-all border-slate-100 flex items-center gap-3 italic"
                            >
                                {selectedIds.length === settlements.length ? 'DESELECCIONAR TODO' : 'SELECCIONAR TODO'}
                            </Button>
                            <div className="relative group/search">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/search:text-indigo-500 transition-colors" />
                                <input
                                    className="h-14 pl-14 pr-8 bg-slate-50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900 placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-500/10 w-64 italic outline-none transition-all"
                                    placeholder="FILTRAR..."
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {settlements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 text-center gap-6 opacity-40">
                            <FileText className="h-20 w-20 text-slate-200" />
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] italic">No hay registros de nómina disponibles</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {settlements.map((s, idx) => (
                                <div
                                    key={s.id}
                                    className={cn(
                                        "p-8 flex items-center gap-10 hover:bg-slate-50/50 transition-all cursor-pointer group/row relative overflow-hidden",
                                        selectedIds.includes(s.id) && "bg-indigo-50/30"
                                    )}
                                    onClick={() => toggleSelect(s.id)}
                                >
                                    {selectedIds.includes(s.id) && (
                                        <div className="absolute left-0 top-0 h-full w-1.5 bg-indigo-500 shadow-[2px_0_10px_#6366f1]" />
                                    )}

                                    <div className="flex items-center gap-6">
                                        <Checkbox
                                            checked={selectedIds.includes(s.id)}
                                            onCheckedChange={() => toggleSelect(s.id)}
                                            className="h-6 w-6 rounded-lg border-2 border-slate-200 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 transition-all"
                                        />
                                        <div className="h-14 w-14 rounded-2xl bg-slate-950 flex items-center justify-center text-white scale-90 group-hover/row:scale-100 transition-transform shadow-active">
                                            <Users className="h-6 w-6 text-indigo-400" />
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-4 mb-2">
                                            <h4 className="text-lg font-black text-slate-950 tracking-tighter uppercase italic truncate">{s.party?.legal_name}</h4>
                                            <Badge variant="outline" className="text-[9px] font-black italic uppercase border-slate-100 tracking-widest">
                                                {s.party?.doc_type}: {s.party?.doc_number}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-6">
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">REG: {s.issue_date}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Landmark className="h-3.5 w-3.5" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">{s.employee?.bank_name || 'BANCO NO DEFINIDO'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Cuenta: {s.employee?.bank_account_number || '****'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right space-y-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none">Neto a Pagar</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-black text-slate-950 italic tracking-tighter">
                                                ${new Intl.NumberFormat('es-CO').format(s.total)}
                                            </span>
                                            <span className="text-[9px] font-black text-indigo-500 uppercase italic">COP</span>
                                        </div>
                                        <Badge className={cn(
                                            "text-[8px] font-black italic uppercase px-3 py-1 rounded-full",
                                            s.status === 'SENT' ? "bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm" : "bg-slate-50 text-slate-400 border border-slate-100"
                                        )}>
                                            {s.status === 'SENT' ? 'TRANSMITIDO' : 'BORRADOR'}
                                        </Badge>
                                    </div>

                                    <div className="opacity-0 group-hover/row:opacity-100 transition-opacity pl-10 border-l border-slate-50 ml-10">
                                        <ArrowRight className="h-8 w-8 text-indigo-500 p-2 bg-indigo-50 rounded-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 🛡️ SECURITY AUDIT */}
            <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                <div className="h-20 w-20 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center text-white rotate-6 hover:rotate-0 transition-transform shadow-active duration-700">
                    <CheckCircle2 className="h-10 w-10 shrink-0" />
                </div>
                <div className="space-y-2">
                    <h5 className="text-xl font-black text-slate-950 tracking-tighter uppercase italic">Protocolo de Integridad Bancaria</h5>
                    <p className="text-xs text-slate-400 font-bold leading-relaxed max-w-3xl italic">
                        Los archivos generados utilizan encriptación de estructura estándar para carga masiva en portales empresariales. Una vez descargado, el archivo debe ser cargado directamente en la sucursal virtual de su entidad bancaria para ejecutar la dispersión.
                    </p>
                </div>
                <div className="ml-auto flex flex-col items-center md:items-end gap-2">
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Motor de Generación</span>
                    <Badge variant="outline" className="font-black italic text-indigo-500 border-indigo-200 px-4 py-1">V3.5 CORE</Badge>
                </div>
            </div>
        </div>
    )
}
