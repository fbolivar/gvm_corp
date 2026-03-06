'use client';

import { Button } from '@/shared/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { technologyPdfService } from '../services/technologyPdfService';
import { technologyExcelService } from '../services/technologyExcelService';
import type { ITAsset, ITMaintenanceSchedule } from '../types';

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
    assignmentMap?: Record<string, string>;
    companyName: string;
    companyNit?: string;
    companyAddress?: string;
    companyPhone?: string;
    logoUrl?: string;
}

export function AssetExportActions({ assets, kpis, maintenanceSchedules, assignmentMap = {}, companyName, companyNit, companyAddress, companyPhone, logoUrl }: Props) {
    const reportOptions = {
        title: 'Inventario Activos IT',
        companyName,
        companyNit,
        companyAddress,
        companyPhone,
        logoUrl,
        period: new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
    };

    const handlePdf = async () => {
        await technologyPdfService.generateAssetReport(assets, kpis, maintenanceSchedules, reportOptions, assignmentMap);
    };

    const handleExcel = async () => {
        await technologyExcelService.exportFormattedExcel(assets, {
            name: companyName,
            nit: companyNit,
            address: companyAddress,
            phone: companyPhone,
            logoUrl,
        }, assignmentMap);
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
