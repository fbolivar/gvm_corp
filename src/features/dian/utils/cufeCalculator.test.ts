import { describe, it, expect } from 'vitest';
import { calculateCufe } from './cufeCalculator';

describe('calculateCufe', () => {
    const baseParams = {
        numFac: 'FV-2026-0001',
        fecFac: '2026-02-01',
        timeFac: '10:30:00-05:00',
        valFac: '2205000.00',
        codImp01: '01',
        valImp01: '419000.00',
        codImp04: '04',
        valImp04: '0.00',
        codImp03: '03',
        valImp03: '0.00',
        valPag: '2624000.00',
        nitOFE: '901444555',
        docAdq: '9002001231',
        clTec: 'fc8eac422eba16e22ffd8c6f94b3f40a6e38162c',
        tipoAmb: '2',
    };

    it('should return a 96-character hex string (SHA-384)', () => {
        const cufe = calculateCufe(
            baseParams.numFac, baseParams.fecFac, baseParams.timeFac,
            baseParams.valFac, baseParams.codImp01, baseParams.valImp01,
            baseParams.codImp04, baseParams.valImp04, baseParams.codImp03,
            baseParams.valImp03, baseParams.valPag, baseParams.nitOFE,
            baseParams.docAdq, baseParams.clTec, baseParams.tipoAmb
        );

        expect(cufe).toHaveLength(96);
        expect(cufe).toMatch(/^[0-9a-f]{96}$/);
    });

    it('should be deterministic (same input = same output)', () => {
        const cufe1 = calculateCufe(
            baseParams.numFac, baseParams.fecFac, baseParams.timeFac,
            baseParams.valFac, baseParams.codImp01, baseParams.valImp01,
            baseParams.codImp04, baseParams.valImp04, baseParams.codImp03,
            baseParams.valImp03, baseParams.valPag, baseParams.nitOFE,
            baseParams.docAdq, baseParams.clTec, baseParams.tipoAmb
        );
        const cufe2 = calculateCufe(
            baseParams.numFac, baseParams.fecFac, baseParams.timeFac,
            baseParams.valFac, baseParams.codImp01, baseParams.valImp01,
            baseParams.codImp04, baseParams.valImp04, baseParams.codImp03,
            baseParams.valImp03, baseParams.valPag, baseParams.nitOFE,
            baseParams.docAdq, baseParams.clTec, baseParams.tipoAmb
        );

        expect(cufe1).toBe(cufe2);
    });

    it('should produce different hash for different invoice number', () => {
        const cufe1 = calculateCufe(
            'FV-2026-0001', baseParams.fecFac, baseParams.timeFac,
            baseParams.valFac, baseParams.codImp01, baseParams.valImp01,
            baseParams.codImp04, baseParams.valImp04, baseParams.codImp03,
            baseParams.valImp03, baseParams.valPag, baseParams.nitOFE,
            baseParams.docAdq, baseParams.clTec, baseParams.tipoAmb
        );
        const cufe2 = calculateCufe(
            'FV-2026-0002', baseParams.fecFac, baseParams.timeFac,
            baseParams.valFac, baseParams.codImp01, baseParams.valImp01,
            baseParams.codImp04, baseParams.valImp04, baseParams.codImp03,
            baseParams.valImp03, baseParams.valPag, baseParams.nitOFE,
            baseParams.docAdq, baseParams.clTec, baseParams.tipoAmb
        );

        expect(cufe1).not.toBe(cufe2);
    });

    it('should produce different hash for different amount', () => {
        const cufe1 = calculateCufe(
            baseParams.numFac, baseParams.fecFac, baseParams.timeFac,
            '2205000.00', baseParams.codImp01, baseParams.valImp01,
            baseParams.codImp04, baseParams.valImp04, baseParams.codImp03,
            baseParams.valImp03, baseParams.valPag, baseParams.nitOFE,
            baseParams.docAdq, baseParams.clTec, baseParams.tipoAmb
        );
        const cufe2 = calculateCufe(
            baseParams.numFac, baseParams.fecFac, baseParams.timeFac,
            '9999999.00', baseParams.codImp01, baseParams.valImp01,
            baseParams.codImp04, baseParams.valImp04, baseParams.codImp03,
            baseParams.valImp03, baseParams.valPag, baseParams.nitOFE,
            baseParams.docAdq, baseParams.clTec, baseParams.tipoAmb
        );

        expect(cufe1).not.toBe(cufe2);
    });

    it('should produce different hash for different environment', () => {
        const cufeProd = calculateCufe(
            baseParams.numFac, baseParams.fecFac, baseParams.timeFac,
            baseParams.valFac, baseParams.codImp01, baseParams.valImp01,
            baseParams.codImp04, baseParams.valImp04, baseParams.codImp03,
            baseParams.valImp03, baseParams.valPag, baseParams.nitOFE,
            baseParams.docAdq, baseParams.clTec, '1'
        );
        const cufeTest = calculateCufe(
            baseParams.numFac, baseParams.fecFac, baseParams.timeFac,
            baseParams.valFac, baseParams.codImp01, baseParams.valImp01,
            baseParams.codImp04, baseParams.valImp04, baseParams.codImp03,
            baseParams.valImp03, baseParams.valPag, baseParams.nitOFE,
            baseParams.docAdq, baseParams.clTec, '2'
        );

        expect(cufeProd).not.toBe(cufeTest);
    });
});
