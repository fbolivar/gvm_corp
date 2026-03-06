'use client';

import { Button } from '@/shared/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { technologyPdfService } from '../services/technologyPdfService';
import { excelReportService } from '@/features/accounting/services/excelReportService';
import type { ITAsset, ITMaintenanceSchedule } from '../types';
import { STATUS_LABELS, CATEGORY_LABELS, CONDITION_LABELS } from '../types';

interface KPIs {
    total: number;
    available: number;
    assigned: number;
    inMaintenance: number;
}

interface Props {
    assets: ITAsset[];
    kpis: KPIs;
    maintenanceSchedules: ITMaintenanceSchedule[];
    companyName: string;
    companyNit?: string;
}

export function AssetExportActions({ assets, kpis, maintenanceSchedules, companyName, companyNit }: Props) {
    const reportOptions = {
        title: 'Inventario Activos IT',
        companyName,
        companyNit,
        period: new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
    };

    const handlePdf = async () => {
        await technologyPdfService.generateAssetReport(assets, kpis, maintenanceSchedules, reportOptions);
    };

    const handleExcel = () => {
        excelReportService.exportToExcel(
            assets.map(a => ({
                'Código': a.asset_code,
                'Nombre': a.name,
                'Categoría': CATEGORY_LABELS[a.category] || a.category,
                'Marca': a.brand || '',
                'Modelo': a.model || '',
                'Serial': a.serial_number || '',
                'Estado': STATUS_LABELS[a.status] || a.status,
                'Condición': CONDITION_LABELS[a.condition] || a.condition,
                'Costo': a.purchase_cost || 0,
                'Fecha Compra': a.purchase_date || '',
                'Garantía': a.warranty_expiry || '',
                'Notas': a.notes || '',
            })),
            'Inventario_Activos_IT',
            'Activos IT',
        );
    };

    return (
        <div className="flex gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={handlePdf}
                className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 gap-2 h-9 px-4 rounded-xl"
            >
                <Download className="h-4 w-4 text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">PDF</span>
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={handleExcel}
                className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 gap-2 h-9 px-4 rounded-xl"
            >
                <FileText className="h-4 w-4 text-blue-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Excel</span>
            </Button>
        </div>
    );
}
