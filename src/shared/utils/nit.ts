/**
 * Calcula el Dígito de Verificación (DV) para un NIT colombiano.
 * @param nit Número de identificación tributaria (sin guiones ni espacios)
 * @returns El dígito de verificación como string (0-9)
 */
export function calculateDV(nit: string): string {
    if (!nit || isNaN(Number(nit))) return '';

    const primes = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
    let sum = 0;
    const reversedNit = nit.split('').reverse().map(Number);

    reversedNit.forEach((digit, index) => {
        if (index < primes.length) {
            sum += digit * primes[index];
        }
    });

    const remainder = sum % 11;
    if (remainder <= 1) {
        return remainder.toString();
    }
    return (11 - remainder).toString();
}
