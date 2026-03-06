/**
 * Convierte un número a su representación en letras en español colombiano.
 * Ej: 1372810 → "UN MILLÓN TRESCIENTOS SETENTA Y DOS MIL OCHOCIENTOS DIEZ PESOS M/CTE"
 */

const UNITS = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const TEENS = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const TENS = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const HUNDREDS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function convertGroup(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'CIEN';

    let result = '';

    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;

    if (hundreds > 0) {
        result += HUNDREDS[hundreds];
        if (remainder > 0) result += ' ';
    }

    if (remainder >= 10 && remainder <= 19) {
        result += TEENS[remainder - 10];
    } else if (remainder >= 20 && remainder <= 29 && remainder !== 20) {
        result += 'VEINTI' + UNITS[remainder - 20];
    } else {
        const tens = Math.floor(remainder / 10);
        const units = remainder % 10;

        if (tens > 0) {
            result += TENS[tens];
            if (units > 0) result += ' Y ';
        }
        if (units > 0) {
            result += UNITS[units];
        }
    }

    return result;
}

function numberToWordsRaw(n: number): string {
    if (n === 0) return 'CERO';

    const billions = Math.floor(n / 1000000000);
    const millions = Math.floor((n % 1000000000) / 1000000);
    const thousands = Math.floor((n % 1000000) / 1000);
    const remainder = n % 1000;

    let result = '';

    if (billions > 0) {
        if (billions === 1) {
            result += 'MIL';
        } else {
            result += convertGroup(billions) + ' MIL';
        }
        result += ' MILLONES';
        if (millions > 0 || thousands > 0 || remainder > 0) result += ' ';
    }

    if (millions > 0) {
        if (millions === 1) {
            result += 'UN MILLÓN';
        } else {
            result += convertGroup(millions) + ' MILLONES';
        }
        if (thousands > 0 || remainder > 0) result += ' ';
    }

    if (thousands > 0) {
        if (thousands === 1) {
            result += 'MIL';
        } else {
            result += convertGroup(thousands) + ' MIL';
        }
        if (remainder > 0) result += ' ';
    }

    if (remainder > 0) {
        result += convertGroup(remainder);
    }

    return result;
}

/**
 * Convierte un valor monetario a letras en español colombiano.
 * @param amount - El monto numérico (ej: 1372810.00)
 * @param currency - Sufijo de moneda (default: "PESOS M/CTE")
 * @returns String en mayúsculas (ej: "UN MILLÓN TRESCIENTOS SETENTA Y DOS MIL OCHOCIENTOS DIEZ PESOS M/CTE")
 */
export function numberToWords(amount: number, currency: string = 'PESOS M/CTE'): string {
    const integer = Math.floor(Math.abs(amount));
    return `${numberToWordsRaw(integer)} ${currency}`;
}
