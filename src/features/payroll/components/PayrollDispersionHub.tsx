"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Checkbox } from "@/shared/components/ui/checkbox"
import {
    Download,
    Landmark,
    Users,
    Calendar,
    CheckCircle2,
    FileText,
    Loader2,
    Banknote,
} from "lucide-react"
import { toast } from "sonner"
import { bankService } from "../services/bankService"
import { cn } from "@/shared/lib/utils"

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
                // 1. Fetch PAYROLL documents with their party info
                const { data: docs, error: docsErr } = await supabase
                    .from('documents')
                    .select(`
                        id,
                        issue_date,
                        total,
                        status,
                        notes_public,
                        party_id,
                        party:parties(legal_name, doc_type, doc_number)
                    `)
                    .eq('doc_type', 'PAYROLL')
                    .order('issue_date', { ascending: false });

                if (docsErr) throw docsErr;
                if (!docs || docs.length === 0) {
                    setSettlements([])
                    return
                }

                // 2. Get party_ids to find matching employees (employees have party_id FK)
                const partyIds = docs.map((d: { party_id?: string }) => d.party_id).filter(Boolean) as string[];

                let employeesByParty: Record<string, { id: string; bank_name: string; bank_account_type: string; bank_account_number: string }> = {};

                if (partyIds.length > 0) {
                    const { data: emps } = await supabase
                        .from('employees')
                        .select('id, party_id, bank_name, bank_account_type, bank_account_number')
                        .in('party_id', partyIds);

                    for (const emp of (emps || [])) {
                        const e = emp as { id: string; party_id: string; bank_name: string; bank_account_type: string; bank_account_number: string };
                        employeesByParty[e.party_id] = {
                            id: e.id,
                            bank_name: e.bank_name,
                            bank_account_type: e.bank_account_type,
                            bank_account_number: e.bank_account_number,
                        };
                    }
                }

                // 3. Merge documents with employee bank data
                const formatted: SettlementRecord[] = docs.map((d: Record<string, unknown>) => {
                    const party = (Array.isArray(d.party) ? d.party[0] : d.party) as SettlementRecord['party'];
                    const employee = employeesByParty[String(d.party_id ?? '')] ?? {
                        id: '', bank_name: '', bank_account_type: '', bank_account_number: ''
                    };
                    return {
                        id: d.id,
                        issue_date: d.issue_date,
                        total: d.total,
                        status: d.status,
                        notes_public: d.notes_public,
                        party,
                        employee,
                    };
                });

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
            toast.error("Seleccione al menos una liquidacion");
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
                } as unknown));

            let content = "";
            let filename = `dispersion_${bank.toLowerCase()}_${new Date().getTime()}`;

            if (bank === 'BANCOLOMBIA') {
                content = bankService.generateBancolombiaPAB(selected as Parameters<typeof bankService.generateBancolombiaPAB>[0], "00012345678");
                filename += ".txt";
            } else if (bank === 'DAVIVIENDA') {
                content = bankService.generateDaviviendaTXT(selected as Parameters<typeof bankService.generateDaviviendaTXT>[0], "900987654");
                filename += ".txt";
            } else {
                content = bankService.generateDispersionFile(selected as Parameters<typeof bankService.generateDispersionFile>[0]);
                filename += ".csv";
            }

            bankService.downloadFile(content, filename);
            toast.success(`Archivo para ${bank} generado`);
        } catch (err) {
            console.error(err);
            toast.error("Error al generar archivo");
        } finally {
            setProcessing(false);
        }
    }

    const fmt = (n: number) => `$${new Intl.NumberFormat('es-CO').format(n)}`

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p className="text-xs text-slate-400">Cargando liquidaciones...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Summary bar + Bank buttons */}
            <Card className="rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                        <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                            <Banknote className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Monto Seleccionado</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">{fmt(stats.totalAmount)}</span>
                                <span className="text-[10px] font-semibold text-indigo-600">{stats.count} registros</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <Button
                            onClick={() => handleGenerate('BANCOLOMBIA')}
                            disabled={selectedIds.length === 0 || processing}
                            size="sm"
                            className="h-9 px-4 rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs"
                        >
                            <Landmark className="h-3.5 w-3.5" />
                            Bancolombia
                        </Button>
                        <Button
                            onClick={() => handleGenerate('DAVIVIENDA')}
                            disabled={selectedIds.length === 0 || processing}
                            size="sm"
                            variant="outline"
                            className="h-9 px-4 rounded-xl gap-2 text-xs"
                        >
                            <Landmark className="h-3.5 w-3.5" />
                            Davivienda
                        </Button>
                        <Button
                            onClick={() => handleGenerate('GENERIC')}
                            disabled={selectedIds.length === 0 || processing}
                            size="sm"
                            variant="outline"
                            className="h-9 px-4 rounded-xl gap-2 text-xs"
                        >
                            <Download className="h-3.5 w-3.5" />
                            CSV Generico
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Settlement list */}
            <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Liquidaciones Listas para Pago</h3>
                        <p className="text-xs text-slate-400">{settlements.length} registros disponibles</p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleSelectAll}
                        className="h-9 px-4 rounded-xl text-xs"
                    >
                        {selectedIds.length === settlements.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                    </Button>
                </div>

                {settlements.length === 0 ? (
                    <div className="py-16 text-center">
                        <FileText className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                        <p className="text-xs text-slate-400">No hay registros de nomina disponibles</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {settlements.map((s) => (
                            <div
                                key={s.id}
                                className={cn(
                                    "px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors cursor-pointer",
                                    selectedIds.includes(s.id) && "bg-indigo-50/30"
                                )}
                                onClick={() => toggleSelect(s.id)}
                            >
                                <Checkbox
                                    checked={selectedIds.includes(s.id)}
                                    onCheckedChange={() => toggleSelect(s.id)}
                                    className="h-5 w-5 rounded-lg shrink-0"
                                />

                                <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                    <Users className="h-4 w-4" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h4 className="text-xs font-bold text-slate-900 leading-snug truncate">{s.party?.legal_name}</h4>
                                        <Badge variant="outline" className="text-[10px] font-medium shrink-0">
                                            {s.party?.doc_type}: {s.party?.doc_number}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3 shrink-0" />
                                            {s.issue_date}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Landmark className="h-3 w-3 shrink-0" />
                                            {s.employee?.bank_name || 'Sin banco'}
                                        </span>
                                        <span>Cta: {s.employee?.bank_account_number || '****'}</span>
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <p className="text-[10px] text-slate-400">Neto</p>
                                    <p className="text-sm font-bold text-slate-900 font-mono tabular-nums">{fmt(s.total)}</p>
                                    <Badge className={cn(
                                        "text-[10px] font-medium mt-1",
                                        s.status === 'SENT'
                                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                            : "bg-slate-50 text-slate-400 border border-slate-100"
                                    )}>
                                        {s.status === 'SENT' ? 'Transmitido' : 'Borrador'}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Info note */}
            <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-start gap-4">
                <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center text-indigo-600 shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-indigo-900">Integridad Bancaria</h3>
                    <p className="text-xs text-indigo-600/80 leading-relaxed mt-1">
                        Los archivos generados utilizan el formato estandar para carga masiva en portales empresariales.
                        Descargue y cargue directamente en la sucursal virtual de su entidad bancaria.
                    </p>
                </div>
            </div>
        </div>
    )
}
