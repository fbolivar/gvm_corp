/**
 * Lectura de extractos bancarios (Excel o CSV) para la conciliación.
 *
 * Cada banco entrega el archivo a su manera: la fecha puede venir como
 * 01/08/2026 o 2026-08-01, el valor como "1.234.567,89" o "1234567.89", y a
 * veces hay dos columnas (débito y crédito) en vez de una sola con signo.
 * Aquí se normaliza todo eso a { date, description, amount } — que es lo que
 * guarda `bank_statement_lines`.
 *
 * Funciones puras, sin Supabase: se pueden probar con Vitest.
 */

export interface ParsedBankLine {
    date: string;          // ISO yyyy-mm-dd
    description: string;
    amount: number;        // positivo = entra dinero, negativo = sale
    reference?: string;
}

export interface ColumnMapping {
    date: number;
    description: number;
    /** Columna de valor con signo. Alternativa a debit/credit. */
    amount?: number;
    /** Columna de salidas (se guarda en negativo). */
    debit?: number;
    /** Columna de entradas. */
    credit?: number;
    reference?: number;
}

const MESES: Record<string, number> = {
    ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6,
    JUL: 7, AGO: 8, SEP: 9, SET: 9, OCT: 10, NOV: 11, DIC: 12,
};

/**
 * Fecha del banco → ISO. Admite dd/mm/aaaa, aaaa-mm-dd, dd-MMM-aaaa y el número
 * de serie de Excel. Devuelve '' si no se reconoce.
 */
export function parseBankDate(value: unknown): string {
    if (value == null) return '';

    // Excel guarda las fechas como número de días desde 1900.
    if (typeof value === 'number' && value > 20000 && value < 60000) {
        const ms = Math.round((value - 25569) * 86400 * 1000);
        return new Date(ms).toISOString().slice(0, 10);
    }
    if (value instanceof Date && !isNaN(value.getTime())) {
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, '0');
        const d = String(value.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    const raw = String(value).trim();
    if (!raw) return '';

    // aaaa-mm-dd o aaaa/mm/dd
    let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(raw);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;

    // dd/mm/aaaa o dd-mm-aaaa (formato colombiano)
    m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/.exec(raw);
    if (m) {
        const year = m[3].length === 2 ? `20${m[3]}` : m[3];
        return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }

    // dd-MMM-aaaa (01-AGO-2026)
    m = /^(\d{1,2})[-/ ]([A-Za-zÁÉÍÓÚáéíóú]{3,})[-/ ](\d{2,4})/.exec(raw);
    if (m) {
        const mes = MESES[m[2].slice(0, 3).toUpperCase()];
        if (mes) {
            const year = m[3].length === 2 ? `20${m[3]}` : m[3];
            return `${year}-${String(mes).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
        }
    }
    return '';
}

/**
 * Valor del banco → número. Entiende el formato colombiano (punto de miles y
 * coma decimal), el anglosajón, los paréntesis de negativo y el signo pegado.
 */
export function parseBankAmount(value: unknown): number {
    if (value == null || value === '') return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

    let raw = String(value).trim().replace(/\s/g, '').replace(/\$/g, '').replace(/COP/gi, '');
    if (!raw) return 0;

    // (1.234) significa negativo en muchos extractos
    let negative = false;
    if (/^\(.*\)$/.test(raw)) { negative = true; raw = raw.slice(1, -1); }
    if (raw.startsWith('-')) { negative = true; raw = raw.slice(1); }
    if (raw.endsWith('-')) { negative = true; raw = raw.slice(0, -1); }

    const lastComma = raw.lastIndexOf(',');
    const lastDot = raw.lastIndexOf('.');

    if (lastComma > -1 && lastDot > -1) {
        // El separador decimal es el que aparece de último.
        if (lastComma > lastDot) raw = raw.replace(/\./g, '').replace(',', '.');
        else raw = raw.replace(/,/g, '');
    } else if (lastComma > -1) {
        // Con 1 o 2 dígitos después de la coma es decimal; si no, es de miles.
        raw = raw.length - lastComma - 1 <= 2 ? raw.replace(',', '.') : raw.replace(/,/g, '');
    } else if (lastDot > -1) {
        const decimals = raw.length - lastDot - 1;
        // "1.234" en Colombia es mil doscientos treinta y cuatro, no 1,234.
        if (decimals === 3) raw = raw.replace(/\./g, '');
    }

    const n = Number(raw.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(n)) return 0;
    return negative ? -n : n;
}

/** ¿La fila parece un encabezado (no tiene fecha ni valor reconocibles)? */
export function looksLikeHeader(row: unknown[], mapping: ColumnMapping): boolean {
    const fecha = parseBankDate(row[mapping.date]);
    return fecha === '';
}

/**
 * Convierte las filas del archivo en líneas de extracto. Descarta encabezados,
 * filas vacías y movimientos en cero (saldos, subtotales).
 */
export function parseBankRows(rows: unknown[][], mapping: ColumnMapping): {
    lines: ParsedBankLine[];
    descartadas: number;
} {
    const lines: ParsedBankLine[] = [];
    let descartadas = 0;

    for (const row of rows) {
        if (!row || row.length === 0) { descartadas++; continue; }

        const date = parseBankDate(row[mapping.date]);
        if (!date) { descartadas++; continue; }

        let amount = 0;
        if (mapping.amount != null) {
            amount = parseBankAmount(row[mapping.amount]);
        } else {
            const debito = mapping.debit != null ? Math.abs(parseBankAmount(row[mapping.debit])) : 0;
            const credito = mapping.credit != null ? Math.abs(parseBankAmount(row[mapping.credit])) : 0;
            amount = credito - debito;
        }
        if (!amount) { descartadas++; continue; }

        const description = String(row[mapping.description] ?? '').trim() || 'MOVIMIENTO BANCARIO';
        const reference = mapping.reference != null ? String(row[mapping.reference] ?? '').trim() : undefined;

        lines.push({ date, description, amount, reference: reference || undefined });
    }

    return { lines, descartadas };
}

/**
 * Adivina qué columna es cuál mirando los encabezados del archivo.
 * El usuario siempre puede corregir el mapeo antes de importar.
 */
export function guessMapping(header: unknown[]): Partial<ColumnMapping> {
    const norm = header.map(h => String(h ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .trim());

    const find = (...claves: string[]) => {
        for (const clave of claves) {
            const i = norm.findIndex(h => h.includes(clave));
            if (i > -1) return i;
        }
        return undefined;
    };

    const mapping: Partial<ColumnMapping> = {
        date: find('fecha', 'date'),
        description: find('descripcion', 'concepto', 'detalle', 'transaccion', 'description'),
        reference: find('referencia', 'documento', 'comprobante', 'reference'),
    };

    const debit = find('debito', 'debe', 'salida', 'retiro', 'cargo');
    const credit = find('credito', 'haber', 'entrada', 'consignacion', 'abono', 'deposito');
    if (debit != null || credit != null) {
        mapping.debit = debit;
        mapping.credit = credit;
    } else {
        mapping.amount = find('valor', 'importe', 'monto', 'amount');
    }
    return mapping;
}
