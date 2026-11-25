'use client';

import { useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { SalespersonKpi } from '../types/kpi';

/** Fila por cliente para la hoja de clasificación del Excel. */
export interface KpiClientRow {
    cliente: string;
    comercial: string;
    categoria: string;
    ultima_compra: string;
    dias_sin_compra: number | null;
    pedidos: number;
    ventas_periodo: number;
    variacion_30d: number | null;
}

export function ExportKpiButton({
    salespeople, clients, period,
}: { salespeople: SalespersonKpi[]; clients: KpiClientRow[]; period: string }) {
    const [loading, setLoading] = useState(false);

    const onExport = async () => {
        setLoading(true);
        try {
            const XLSX = await import('xlsx');

            const spSheet = XLSX.utils.json_to_sheet(salespeople.map(s => ({
                Comercial: s.salesperson_name,
                'Visitas planeadas': s.planned,
                Realizadas: s.realizada,
                'No realizadas': s.no_realizada,
                Reprogramadas: s.reprogramada,
                Pendientes: s.pendiente,
                'Cumplimiento (realizadas/planeadas) %': s.compliance_pct,
                Semáforo: s.semaphore === 'green' ? 'Verde' : s.semaphore === 'amber' ? 'Amarillo' : 'Rojo',
                'Meta de visitas': s.target_visits ?? '',
                'Avance vs meta %': s.target_pct ?? '',
                'Seguimientos vencidos': s.overdue,
                'Cuentas críticas': s.critical,
            })));
            spSheet['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 13 }, { wch: 13 }, { wch: 11 }, { wch: 32 }, { wch: 11 }, { wch: 14 }, { wch: 15 }, { wch: 19 }, { wch: 15 }];

            const clSheet = XLSX.utils.json_to_sheet(clients.map(c => ({
                Cliente: c.cliente,
                Comercial: c.comercial,
                Clasificación: c.categoria,
                'Última compra': c.ultima_compra,
                'Días sin compra': c.dias_sin_compra ?? '',
                Pedidos: c.pedidos,
                'Ventas del año (acumulado)': c.ventas_periodo,
                'Variación 30d %': c.variacion_30d ?? '',
            })));
            clSheet['!cols'] = [{ wch: 36 }, { wch: 24 }, { wch: 26 }, { wch: 14 }, { wch: 14 }, { wch: 9 }, { wch: 18 }, { wch: 15 }];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, spSheet, 'Cumplimiento comerciales');
            XLSX.utils.book_append_sheet(wb, clSheet, 'Clasificación clientes');
            XLSX.writeFile(wb, `KPIs-visitas-${period}.xlsx`);
            toast.success('Excel generado');
        } catch (e) {
            toast.error('No se pudo generar el Excel');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button type="button" onClick={onExport} disabled={loading}
            className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Exportar Excel
        </button>
    );
}
