'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { importSalesReportAction, type ImportResult } from '../actions';
import { aggregateSalesRows, distinctSalespeople, type RawSalesRow, type AggregatedSalesRow } from '../services/salesReportImport';

const SHEET = 'BASE';
const SEND_BATCH = 2000;

function findCol(header: string[], name: string): number {
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    return header.findIndex(h => norm(h) === norm(name));
}

function parseReport(buffer: ArrayBuffer): { rows: AggregatedSalesRow[]; error?: string } {
    const XLSX = require('xlsx') as typeof import('xlsx');
    const wb = XLSX.read(new Uint8Array(buffer));
    const ws = wb.Sheets[SHEET];
    if (!ws) return { rows: [], error: `El archivo no tiene la hoja "${SHEET}". Usa el informe general de Viviana.` };

    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
    if (raw.length < 2) return { rows: [], error: 'La hoja BASE está vacía.' };

    const header = (raw[0] as unknown[]).map(c => String(c ?? ''));
    const cVend = findCol(header, 'Vendedor');
    const cDesc = findCol(header, 'Descripción');
    const cAnio = findCol(header, 'AÑO');
    const cMes = findCol(header, 'MES');
    const cQty = findCol(header, 'Cantidad');
    const cNeto = findCol(header, 'Neto');
    if ([cVend, cDesc, cAnio, cMes, cQty, cNeto].some(i => i < 0)) {
        return { rows: [], error: 'No se encontraron las columnas esperadas (Vendedor, Descripción, AÑO, MES, Cantidad, Neto).' };
    }

    const rawRows: RawSalesRow[] = [];
    for (let i = 1; i < raw.length; i++) {
        const row = raw[i] as unknown[];
        const vendedor = String(row[cVend] ?? '').trim();
        if (!vendedor) continue;
        rawRows.push({
            vendedor,
            descripcion: String(row[cDesc] ?? ''),
            anio: row[cAnio] as number | string,
            mes: row[cMes] as number | string,
            cantidad: row[cQty] as number | string,
            neto: row[cNeto] as number | string,
        });
    }
    return { rows: aggregateSalesRows(rawRows) };
}

interface Preview {
    rows: AggregatedSalesRow[];
    salespeople: string[];
    months: string[];
}

export function SalesReportImporter() {
    const [preview, setPreview] = useState<Preview | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [parsing, setParsing] = useState(false);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const handleFile = useCallback(async (file: File) => {
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            toast.error('Solo se aceptan archivos Excel (.xlsx o .xls)');
            return;
        }
        setResult(null);
        setFileName(file.name);
        setParsing(true);
        try {
            const buffer = await file.arrayBuffer();
            const { rows, error } = parseReport(buffer);
            if (error) { toast.error(error); setFileName(null); return; }
            const months = [...new Set(rows.map(r => `${r.year}-${String(r.month).padStart(2, '0')}`))].sort();
            setPreview({ rows, salespeople: distinctSalespeople(rows), months });
        } catch (e) {
            toast.error('No se pudo leer el archivo');
            console.error(e);
            setFileName(null);
        } finally {
            setParsing(false);
        }
    }, []);

    const handleImport = async () => {
        if (!preview) return;
        setImporting(true);
        const acc: ImportResult = { success: true, imported_rows: 0, months: [], unmatched_products: [], unmapped_salespeople: [] };
        const up = new Set<string>(), um = new Set<string>(), mo = new Set<string>();
        try {
            for (let i = 0; i < preview.rows.length; i += SEND_BATCH) {
                const chunk = preview.rows.slice(i, i + SEND_BATCH);
                const res = await importSalesReportAction(chunk);
                if (res.error) { setResult({ error: res.error }); setImporting(false); return; }
                acc.imported_rows! += res.imported_rows ?? 0;
                (res.unmatched_products ?? []).forEach(x => up.add(x));
                (res.unmapped_salespeople ?? []).forEach(x => um.add(x));
                (res.months ?? []).forEach(x => mo.add(x));
            }
            acc.unmatched_products = [...up].sort();
            acc.unmapped_salespeople = [...um].sort();
            acc.months = [...mo].sort();
            setResult(acc);
            toast.success(`Histórico importado: ${acc.imported_rows!.toLocaleString('es-CO')} registros`);
        } catch (e) {
            toast.error('Error inesperado al importar');
            console.error(e);
        } finally {
            setImporting(false);
        }
    };

    const reset = () => { setPreview(null); setFileName(null); setResult(null); };

    if (result) {
        const ok = !result.error;
        return (
            <div className="space-y-4">
                <div className={cn('rounded-2xl border p-6 flex items-start gap-4', ok ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50')}>
                    {ok ? <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />}
                    <div>
                        <p className={cn('text-sm font-bold', ok ? 'text-emerald-900' : 'text-rose-900')}>
                            {ok ? 'Histórico de ventas importado' : 'No se pudo importar'}
                        </p>
                        <p className="text-xs text-slate-500">{result.error ?? `${result.imported_rows?.toLocaleString('es-CO')} registros · meses ${result.months?.join(', ')}`}</p>
                    </div>
                </div>

                {ok && (result.unmapped_salespeople?.length ?? 0) > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-xs font-bold text-amber-900 mb-1">Vendedores sin usuario asignado ({result.unmapped_salespeople!.length})</p>
                        <p className="text-[11px] text-amber-700 mb-2">Quedaron registrados para que los asignes al comercial correcto (o déjalos como vacante).</p>
                        <div className="flex flex-wrap gap-1.5">
                            {result.unmapped_salespeople!.map(s => <span key={s} className="text-[10px] bg-white border border-amber-200 rounded-full px-2 py-0.5 text-amber-800">{s}</span>)}
                        </div>
                    </div>
                )}

                {ok && (result.unmatched_products?.length ?? 0) > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-40 overflow-y-auto">
                        <p className="text-xs font-bold text-slate-700 mb-1">Códigos sin producto en el catálogo ({result.unmatched_products!.length})</p>
                        <div className="flex flex-wrap gap-1.5">
                            {result.unmatched_products!.slice(0, 60).map(s => <span key={s} className="text-[10px] bg-white border border-slate-200 rounded-full px-2 py-0.5 text-slate-600 font-mono">{s}</span>)}
                        </div>
                    </div>
                )}

                <Button onClick={reset} variant="outline" className="h-9 rounded-xl text-xs gap-2">
                    <RefreshCw className="h-3.5 w-3.5" /> Importar otro informe
                </Button>
            </div>
        );
    }

    if (preview) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                        <div>
                            <p className="text-sm font-bold text-slate-900">{fileName}</p>
                            <p className="text-xs text-slate-400">{preview.rows.length.toLocaleString('es-CO')} registros agregados · {preview.salespeople.length} vendedores · {preview.months.length} meses</p>
                        </div>
                    </div>
                    <button onClick={reset} className="text-slate-300 hover:text-slate-500"><X className="h-4 w-4" /></button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl border border-slate-100 p-4">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Meses detectados</p>
                        <p className="text-xs text-slate-600">{preview.months.join(', ')}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-100 p-4 max-h-32 overflow-y-auto">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Vendedores en el informe</p>
                        <div className="flex flex-wrap gap-1">
                            {preview.salespeople.map(s => <span key={s} className="text-[10px] bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5 text-slate-600">{s}</span>)}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button onClick={handleImport} disabled={importing} className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold gap-2">
                        {importing ? <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</> : <><Upload className="h-4 w-4" /> Importar histórico</>}
                    </Button>
                    <Button onClick={reset} variant="outline" disabled={importing} className="h-10 rounded-xl text-sm">Cancelar</Button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn('border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer', dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => document.getElementById('sales-report-input')?.click()}
        >
            <input id="sales-report-input" type="file" accept=".xlsx,.xls" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
            <div className="flex flex-col items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                    {parsing ? <Loader2 className="h-7 w-7 text-indigo-500 animate-spin" /> : <FileSpreadsheet className="h-7 w-7 text-indigo-500" />}
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-900">{parsing ? 'Leyendo el informe...' : dragOver ? 'Suelta el archivo aquí' : 'Arrastra el informe de ventas o haz clic'}</p>
                    <p className="text-xs text-slate-400 mt-1">Informe general de Viviana (hoja BASE) · .xlsx</p>
                </div>
            </div>
        </div>
    );
}
