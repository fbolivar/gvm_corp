import { describe, it, expect } from 'vitest';
import { overtimeService } from './overtimeService';

describe('overtimeService.calculateOvertimeValue', () => {
    const baseSalary = 3000000;
    const hourlyRate = baseSalary / 240; // $12,500

    it('should calculate diurna overtime at 1.25x', () => {
        const result = overtimeService.calculateOvertimeValue(baseSalary, 10, 'diurna');
        expect(result).toBe(Math.round(hourlyRate * 1.25 * 10));
    });

    it('should calculate nocturna overtime at 1.75x', () => {
        const result = overtimeService.calculateOvertimeValue(baseSalary, 8, 'nocturna');
        expect(result).toBe(Math.round(hourlyRate * 1.75 * 8));
    });

    it('should calculate festiva overtime at 2.0x', () => {
        const result = overtimeService.calculateOvertimeValue(baseSalary, 5, 'festiva');
        expect(result).toBe(Math.round(hourlyRate * 2.0 * 5));
    });

    it('should default to diurna when type not specified', () => {
        const result = overtimeService.calculateOvertimeValue(baseSalary, 10);
        expect(result).toBe(Math.round(hourlyRate * 1.25 * 10));
    });

    it('should return 0 for 0 hours', () => {
        const result = overtimeService.calculateOvertimeValue(baseSalary, 0, 'diurna');
        expect(result).toBe(0);
    });

    it('should round to integer (no decimals in COP)', () => {
        const result = overtimeService.calculateOvertimeValue(1450000, 3, 'nocturna');
        expect(Number.isInteger(result)).toBe(true);
    });

    it('should scale linearly with hours', () => {
        const oneHour = overtimeService.calculateOvertimeValue(baseSalary, 1, 'diurna');
        const tenHours = overtimeService.calculateOvertimeValue(baseSalary, 10, 'diurna');
        expect(tenHours).toBe(oneHour * 10);
    });

    it('should scale linearly with salary (within rounding tolerance)', () => {
        const low = overtimeService.calculateOvertimeValue(1200000, 10, 'diurna');
        const high = overtimeService.calculateOvertimeValue(3600000, 10, 'diurna');
        // Allow +-1 for rounding
        expect(Math.abs(high - low * 3)).toBeLessThanOrEqual(1);
    });

    it('festiva > nocturna > diurna for same hours', () => {
        const diurna = overtimeService.calculateOvertimeValue(baseSalary, 10, 'diurna');
        const nocturna = overtimeService.calculateOvertimeValue(baseSalary, 10, 'nocturna');
        const festiva = overtimeService.calculateOvertimeValue(baseSalary, 10, 'festiva');

        expect(festiva).toBeGreaterThan(nocturna);
        expect(nocturna).toBeGreaterThan(diurna);
    });
});
