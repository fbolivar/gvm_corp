import { describe, it, expect } from 'vitest';
import { calculateCune } from './cuneCalculator';

describe('calculateCune', () => {
    const baseParams = {
        numNie: 'NOM-001',
        fecNie: '2026-02-28',
        timeNie: '14:00:00-05:00',
        valDev: '3175000.00',
        valDed: '240000.00',
        valPag: '2935000.00',
        nitNie: '901444555',
        docEmp: '39456781',
        tipoNie: '102',
        softwarePin: '12345',
        tipoAmb: '2',
    };

    it('should return a 96-character hex string (SHA-384)', () => {
        const cune = calculateCune(
            baseParams.numNie, baseParams.fecNie, baseParams.timeNie,
            baseParams.valDev, baseParams.valDed, baseParams.valPag,
            baseParams.nitNie, baseParams.docEmp, baseParams.tipoNie,
            baseParams.softwarePin, baseParams.tipoAmb
        );

        expect(cune).toHaveLength(96);
        expect(cune).toMatch(/^[0-9a-f]{96}$/);
    });

    it('should be deterministic', () => {
        const cune1 = calculateCune(
            baseParams.numNie, baseParams.fecNie, baseParams.timeNie,
            baseParams.valDev, baseParams.valDed, baseParams.valPag,
            baseParams.nitNie, baseParams.docEmp
        );
        const cune2 = calculateCune(
            baseParams.numNie, baseParams.fecNie, baseParams.timeNie,
            baseParams.valDev, baseParams.valDed, baseParams.valPag,
            baseParams.nitNie, baseParams.docEmp
        );

        expect(cune1).toBe(cune2);
    });

    it('should produce different hash for different employee', () => {
        const cune1 = calculateCune(
            baseParams.numNie, baseParams.fecNie, baseParams.timeNie,
            baseParams.valDev, baseParams.valDed, baseParams.valPag,
            baseParams.nitNie, '39456781'
        );
        const cune2 = calculateCune(
            baseParams.numNie, baseParams.fecNie, baseParams.timeNie,
            baseParams.valDev, baseParams.valDed, baseParams.valPag,
            baseParams.nitNie, '79567892'
        );

        expect(cune1).not.toBe(cune2);
    });

    it('should produce different hash for different amounts', () => {
        const cune1 = calculateCune(
            baseParams.numNie, baseParams.fecNie, baseParams.timeNie,
            '3175000.00', '240000.00', '2935000.00',
            baseParams.nitNie, baseParams.docEmp
        );
        const cune2 = calculateCune(
            baseParams.numNie, baseParams.fecNie, baseParams.timeNie,
            '5000000.00', '400000.00', '4600000.00',
            baseParams.nitNie, baseParams.docEmp
        );

        expect(cune1).not.toBe(cune2);
    });

    it('should use default values for tipoNie, softwarePin, tipoAmb', () => {
        const cuneWithDefaults = calculateCune(
            baseParams.numNie, baseParams.fecNie, baseParams.timeNie,
            baseParams.valDev, baseParams.valDed, baseParams.valPag,
            baseParams.nitNie, baseParams.docEmp
        );
        const cuneExplicit = calculateCune(
            baseParams.numNie, baseParams.fecNie, baseParams.timeNie,
            baseParams.valDev, baseParams.valDed, baseParams.valPag,
            baseParams.nitNie, baseParams.docEmp, '102', '12345', '2'
        );

        expect(cuneWithDefaults).toBe(cuneExplicit);
    });
});
