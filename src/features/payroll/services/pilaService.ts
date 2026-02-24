import { PayrollSettlement, SocialSecuritySummary } from "../types";

export interface PilaRecord {
    employee_name: string;
    employee_doc: string;
    ibc: number;
    health_employee: number;
    health_employer: number;
    pension_employee: number;
    pension_employer: number;
    arl: number;
    ccf: number;
    sena: number;
    icbf: number;
    total: number;
}

export const pilaService = {
    /**
     * Genera un resumen consolidado para el reporte PILA
     */
    generatePilaSummary(settlements: (PayrollSettlement & { employee_name: string; employee_doc: string })[]): PilaRecord[] {
        return settlements.map(s => {
            const ss = s.social_security!;
            return {
                employee_name: s.employee_name,
                employee_doc: s.employee_doc,
                ibc: ss.ibc,
                health_employee: ss.employee.health,
                health_employer: ss.employer.health,
                pension_employee: ss.employee.pension,
                pension_employer: ss.employer.pension,
                arl: ss.employer.arl,
                ccf: ss.parafiscales.ccf,
                sena: ss.parafiscales.sena,
                icbf: ss.parafiscales.icbf,
                total: ss.employee.total + ss.employer.total + ss.parafiscales.total
            };
        });
    },

    /**
     * Exporta los datos a formato CSV (Base para operadores PILA)
     */
    exportToCsv(records: PilaRecord[]): string {
        const headers = [
            'Empleado',
            'Documento',
            'IBC',
            'Salud Empleado',
            'Salud Patrón',
            'Pensión Empleado',
            'Pensión Patrón',
            'ARL',
            'CCF',
            'SENA',
            'ICBF',
            'Total Aportes'
        ];

        const rows = records.map(r => [
            r.employee_name,
            r.employee_doc,
            Math.round(r.ibc),
            Math.round(r.health_employee),
            Math.round(r.health_employer),
            Math.round(r.pension_employee),
            Math.round(r.pension_employer),
            Math.round(r.arl),
            Math.round(r.ccf),
            Math.round(r.sena),
            Math.round(r.icbf),
            Math.round(r.total)
        ].join(','));

        return [headers.join(','), ...rows].join('\n');
    }
};
