import { createHash } from 'crypto';

/**
 * Calculates the CUFE (Código Único de Factura Electrónica)
 * Algorithm: SHA-384 of the concatenated values.
 * Fields: NumFac + FecFac + ValFac + CodImp1 + ValImp1 + CodImp2 + ValImp2 + ValImp3 + ValPag + NitOFE + DocAdq + ClTec + TipoAmb
 */
export const calculateCufe = (
    numFac: string,       // Número de factura
    fecFac: string,       // Fecha de factura (YYYY-MM-DD)
    timeFac: string,       // Hora de factura (HH:mm:ss-05:00) - NOTE: DIAN sometimes concatenates time too, checking Annex 1.8... actually standard is just Date usually, but let's stick to the list above.
    // Wait, Annex 1.8 says: NumFac + FecFac + HoraFac + ValFac... 
    // Let's implement the standard inputs based on the list.

    valFac: string,       // Valor Factura sin impuestos (Base Imponible / TotalLineaArriba)
    codImp01: string,     // 01 (IVA)
    valImp01: string,     // Valor IVA
    codImp04: string,     // 04 (Consumo)
    valImp04: string,     // Valor Consumo
    codImp03: string,     // 03 (ICA)
    valImp03: string,     // Valor ICA
    valPag: string,       // Valor Total a Pagar (Total bruto + impuestos - retenciones)
    nitOFE: string,       // NIT Obligado a Facturar (Emisor)
    docAdq: string,       // Código Tipo Documento Adquiriente (CC, NIT) -> NO, it's Number ID Adquiriente
    clTec: string,        // Clave Técnica
    tipoAmb: string       // 1=Prod, 2=Test
): string => {

    // Normalize values (remove comas, verify decimals if needed)
    // For this implementation we assume strings are formatted correctly (e.g. "100.00")

    const concatenated = [
        numFac,
        fecFac,
        timeFac,
        valFac,
        codImp01,
        valImp01,
        codImp04,
        valImp04,
        codImp03,
        valImp03,
        valPag,
        nitOFE,
        docAdq,
        clTec,
        tipoAmb
    ].join('');

    return createHash('sha384').update(concatenated).digest('hex');
}
