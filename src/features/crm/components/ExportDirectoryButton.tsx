'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import type { DirectoryRow } from '../types/directory';

/** Exporta a Excel los contactos mostrados (respeta el filtro de búsqueda actual). */
export function ExportDirectoryButton({ rows }: { rows: DirectoryRow[] }) {
    const [busy, setBusy] = useState(false);

    async function handleExport() {
        if (rows.length === 0) { toast.error('No hay contactos para exportar'); return; }
        setBusy(true);
        try {
            const XLSX = await import('xlsx');
            const data = rows.map(r => ({
                'Contacto': r.name,
                'Cargo': r.role ?? '',
                'Cliente': r.party_name,
                'NIT': r.party_nit ?? '',
                'Ciudad': r.party_city ?? '',
                'Teléfono': r.phone ?? '',
                'Celular': r.mobile ?? '',
                'Email': r.email ?? '',
                'Principal': r.is_primary ? 'Sí' : '',
                'Notas': r.notes ?? '',
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            ws['!cols'] = [{ wch: 26 }, { wch: 22 }, { wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 28 }, { wch: 10 }, { wch: 40 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Directorio');
            XLSX.writeFile(wb, `directorio-contactos-${new Date().toISOString().slice(0, 10)}.xlsx`);
            toast.success(`Excel con ${rows.length} contacto(s) descargado`);
        } catch (e) {
            console.error(e);
            toast.error('No se pudo generar el Excel');
        } finally {
            setBusy(false);
        }
    }

    return (
        <button
            type="button"
            onClick={handleExport}
            disabled={busy}
            className="inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} Exportar Excel
        </button>
    );
}
