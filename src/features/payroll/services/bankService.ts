import { PayrollSettlement, Employee } from "../types";

export interface VendorPayment {
    party_name: string;
    doc_type: string;       // CC, NIT, CE
    doc_number: string;
    bank_name: string;
    account_type: 'SAVINGS' | 'CHECKING';
    account_number: string;
    amount: number;
    reference: string;      // document number or payment reference
}

export const bankService = {
    /**
     * Genera un archivo CSV para dispersión de fondos (Formato Genérico compatible con bancos colombianos)
     */
    generateDispersionFile(settlements: (PayrollSettlement & { employee: Employee })[]): string {
        const headers = [
            'Tipo Documento',
            'Documento Destino',
            'Nombre Beneficiario',
            'Valor Transferencia',
            'Tipo Cuenta (CA/CC)',
            'Número Cuenta',
            'Banco',
            'Referencia'
        ];

        const rows = settlements.map(s => {
            const emp = s.employee;
            const party = emp.party;

            return [
                party?.doc_type || 'CC',
                party?.doc_number || '',
                party?.legal_name || '',
                Math.round(s.net_pay),
                emp.bank_account_type === 'SAVINGS' ? 'CA' : 'CC',
                emp.bank_account_number || '',
                emp.bank_name || 'BANCOLOMBIA',
                `PAGO NOMINA ${s.period_end}`
            ].map(val => `"${val}"`).join(',');
        });

        return [headers.join(','), ...rows].join('\n');
    },

    /**
     * Genera Formato PAB Bancolombia (Pagos Automáticos Bancolombia)
     * Estructura simplificada basada en requerimientos comunes de SVE
     */
    generateBancolombiaPAB(settlements: (PayrollSettlement & { employee: Employee })[], sourceAccount: string): string {
        // Encabezado (Header) - Opcional en algunos bancos pero recomendado
        const header = `1${sourceAccount.padStart(11, '0')}PAGO NOMINA${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;

        // Registros de Detalle (Detail lines)
        const details = settlements.map(s => {
            const emp = s.employee;
            const party = emp.party;
            const amount = Math.round(s.net_pay).toString().padStart(12, '0');
            const accountType = emp.bank_account_type === 'SAVINGS' ? '7' : '1'; // 7: Ahorros, 1: Corriente
            const accountNumber = (emp.bank_account_number || '').padStart(11, '0').slice(-11);
            const docType = party?.doc_type === 'NIT' ? 'N' : 'C'; // N: NIT, C: CC
            const docNumber = (party?.doc_number || '').padStart(11, '0').slice(-11);
            const name = (party?.legal_name || '').slice(0, 30).padEnd(30, ' ');

            // Formato Fijo (Ejemplo de estructura técnica PAB)
            return `6${docNumber}${name}${accountType}${accountNumber}${amount}NOMINA`;
        });

        return [header, ...details].join('\n');
    },

    /**
     * Genera Formato Davivienda para Pagos Masivos
     */
    generateDaviviendaTXT(settlements: (PayrollSettlement & { employee: Employee })[], companyNit: string): string {
        // Registro de Control (RC)
        const rc = `RC${companyNit.padStart(16, '0')}PAYROLL${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;

        // Registros de Traslado (TR)
        const details = settlements.map(s => {
            const emp = s.employee;
            const party = emp.party;
            const amount = Math.round(s.net_pay).toString().padStart(18, '0');
            const accountType = emp.bank_account_type === 'SAVINGS' ? '01' : '02'; // 01: Ahorros, 02: Corriente
            const accountNumber = (emp.bank_account_number || '').padStart(16, '0');
            const docType = party?.doc_type === 'NIT' ? '02' : '01'; // 01: CC, 02: NIT
            const docNumber = (party?.doc_number || '').padStart(18, '0');

            return `TR${docType}${docNumber}${accountType}${accountNumber}${amount}001`;
        });

        return [rc, ...details].join('\n');
    },

    /**
     * Descarga el archivo generado
     */
    downloadFile(content: string, filename: string) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    },

    /**
     * Genera CSV genérico para pagos a proveedores/terceros
     */
    generateVendorPaymentCSV(payments: VendorPayment[]): string {
        const headers = [
            'Tipo Documento',
            'Número Documento',
            'Nombre Beneficiario',
            'Valor',
            'Tipo Cuenta (CA/CC)',
            'Número Cuenta',
            'Banco',
            'Referencia'
        ];

        const rows = payments.map(p => [
            p.doc_type,
            p.doc_number,
            p.party_name,
            Math.round(p.amount),
            p.account_type === 'SAVINGS' ? 'CA' : 'CC',
            p.account_number,
            p.bank_name,
            p.reference,
        ].map(val => `"${val}"`).join(','));

        return [headers.join(','), ...rows].join('\n');
    },

    /**
     * Genera Formato PAB Bancolombia para pagos a proveedores (SVE)
     */
    generateVendorBancolombiaPAB(payments: VendorPayment[], sourceAccount: string): string {
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const header = `1${sourceAccount.padStart(11, '0')}PAGO PROVEED${dateStr}`;

        const details = payments.map(p => {
            const amount = Math.round(p.amount).toString().padStart(12, '0');
            const accountType = p.account_type === 'SAVINGS' ? '7' : '1';
            const accountNumber = p.account_number.padStart(11, '0').slice(-11);
            const docType = p.doc_type === 'NIT' ? 'N' : 'C';
            const docNumber = p.doc_number.padStart(11, '0').slice(-11);
            const name = p.party_name.slice(0, 30).padEnd(30, ' ');
            return `6${docNumber}${name}${accountType}${accountNumber}${amount}${p.reference.slice(0, 10).padEnd(10, ' ')}`;
        });

        return [header, ...details].join('\n');
    },

    /**
     * Genera Formato Davivienda para pagos a proveedores
     */
    generateVendorDaviviendaTXT(payments: VendorPayment[], companyNit: string): string {
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const rc = `RC${companyNit.padStart(16, '0')}VENDOR${dateStr}`;

        const details = payments.map(p => {
            const amount = Math.round(p.amount).toString().padStart(18, '0');
            const accountType = p.account_type === 'SAVINGS' ? '01' : '02';
            const accountNumber = p.account_number.padStart(16, '0');
            const docType = p.doc_type === 'NIT' ? '02' : '01';
            const docNumber = p.doc_number.padStart(18, '0');
            return `TR${docType}${docNumber}${accountType}${accountNumber}${amount}001`;
        });

        return [rc, ...details].join('\n');
    },
};
