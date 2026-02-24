import { createHash } from 'crypto';

/**
 * Calculates the CUNE (Código Único de Nómina Electrónica)
 * Algorithm: SHA-384 of the concatenated values.
 * Standard Sequence: NumNie + FecNie + HorNie + ValDev + ValDed + ValPag + NitNie + DocEmp + TipoNie + SoftwarePin + TipoAmb
 */
export const calculateCune = (
    numNie: string,       // Número de documento (Consecutivo)
    fecNie: string,       // Fecha de emisión (YYYY-MM-DD)
    timeNie: string,      // Hora (HH:mm:ss-05:00)
    valDev: string,       // Valor Devengado (Eearnings)
    valDed: string,       // Valor Deducido (Deductions)
    valPag: string,       // Valor Total a Pagar (Net)
    nitNie: string,       // NIT Emisor (Employer)
    docEmp: string,       // Identificación del empleado
    tipoNie: string = '102', // 102 = Nómina Individual
    softwarePin: string = '12345',
    tipoAmb: string = '2'  // 1=Prod, 2=Test
): string => {

    const concatenated = [
        numNie,
        fecNie,
        timeNie,
        valDev,
        valDed,
        valPag,
        nitNie,
        docEmp,
        tipoNie,
        softwarePin,
        tipoAmb
    ].join('');

    console.log("CUNE String:", concatenated);

    return createHash('sha384').update(concatenated).digest('hex');
}
