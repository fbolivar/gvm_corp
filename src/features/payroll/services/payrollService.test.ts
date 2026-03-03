import { describe, it, expect } from 'vitest';
import { payrollService, PAYROLL_CONSTANTS } from './payrollService';
import { Employee, PayrollLoan, PayrollBenefit } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────
function makeEmployee(overrides: Partial<Employee> = {}): Employee {
    return {
        id: 'emp-001',
        tenant_id: 'tenant-001',
        party_id: 'party-001',
        contract_type: 'INDEFINIDO',
        start_date: '2024-01-01',
        salary: 3000000,
        transport_allowance: true,
        risk_level: '1',
        payment_method: 'TRANSFERENCIA',
        status: 'ACTIVE',
        ...overrides,
    } as Employee;
}

function makeLoan(overrides: Partial<PayrollLoan> = {}): PayrollLoan {
    return {
        id: 'loan-001',
        tenant_id: 'tenant-001',
        employee_id: 'emp-001',
        amount_total: 3000000,
        amount_paid: 1000000,
        installment_count: 6,
        installments_paid: 2,
        installment_amount: 500000,
        interest_rate: 0,
        start_date: '2025-12-01',
        description: 'Prestamo personal',
        status: 'ACTIVE',
        ...overrides,
    } as PayrollLoan;
}

function makeBenefit(overrides: Partial<PayrollBenefit> = {}): PayrollBenefit {
    return {
        id: 'ben-001',
        tenant_id: 'tenant-001',
        employee_id: 'emp-001',
        name: 'Auxilio Movilidad',
        amount: 200000,
        is_taxable: false,
        is_salary: false,
        frequency: 'MONTHLY',
        status: 'ACTIVE',
        ...overrides,
    } as PayrollBenefit;
}

// ─── Social Security ────────────────────────────────────────────────────────
describe('payrollService.calculateSocialSecuritySummary', () => {
    it('should calculate employee health at 4% of IBC', () => {
        const result = payrollService.calculateSocialSecuritySummary(3000000, 3000000, '1');
        expect(result.employee.health).toBe(3000000 * 0.04);
    });

    it('should calculate employee pension at 4% of IBC', () => {
        const result = payrollService.calculateSocialSecuritySummary(3000000, 3000000, '1');
        expect(result.employee.pension).toBe(3000000 * 0.04);
    });

    it('should exempt employer health/SENA/ICBF when salary < 10 SMLV (Ley 1607)', () => {
        const salary = PAYROLL_CONSTANTS.SMLV_2026 * 5; // 5 SMLV, should be exempt
        const result = payrollService.calculateSocialSecuritySummary(salary, salary, '1');

        expect(result.employer.health).toBe(0);
        expect(result.parafiscales.sena).toBe(0);
        expect(result.parafiscales.icbf).toBe(0);
    });

    it('should NOT exempt when salary >= 10 SMLV', () => {
        const salary = PAYROLL_CONSTANTS.SMLV_2026 * 10; // Exactly 10 SMLV
        const result = payrollService.calculateSocialSecuritySummary(salary, salary, '1');

        expect(result.employer.health).toBeGreaterThan(0);
        expect(result.parafiscales.sena).toBeGreaterThan(0);
        expect(result.parafiscales.icbf).toBeGreaterThan(0);
    });

    it('should always charge CCF at 4%', () => {
        const result = payrollService.calculateSocialSecuritySummary(3000000, 3000000, '1');
        expect(result.parafiscales.ccf).toBe(3000000 * 0.04);
    });

    it('should apply correct ARL rate by risk level', () => {
        const result = payrollService.calculateSocialSecuritySummary(3000000, 3000000, '3');
        expect(result.employer.arl).toBe(3000000 * PAYROLL_CONSTANTS.ARL_RATES['3']);
    });

    it('should sum total_cost correctly (employer + parafiscales)', () => {
        const result = payrollService.calculateSocialSecuritySummary(3000000, 3000000, '1');
        const expected = result.employer.total + result.parafiscales.total;
        expect(result.total_cost).toBe(expected);
    });
});

// ─── Provisions ─────────────────────────────────────────────────────────────
describe('payrollService.calculateProvisions', () => {
    it('should calculate cesantias at 8.33% of (IBC + transport)', () => {
        const result = payrollService.calculateProvisions(3000000, 175000, 3000000);
        const base = 3000000 + 175000;
        expect(result.cesantias).toBeCloseTo(base * 0.0833, 0);
    });

    it('should calculate prima at 8.33% of (IBC + transport)', () => {
        const result = payrollService.calculateProvisions(3000000, 175000, 3000000);
        const base = 3000000 + 175000;
        expect(result.prima).toBeCloseTo(base * 0.0833, 0);
    });

    it('should calculate vacaciones at 4.17% of IBC only (no transport)', () => {
        const result = payrollService.calculateProvisions(3000000, 175000, 3000000);
        expect(result.vacaciones).toBeCloseTo(3000000 * 0.0417, 0);
    });

    it('should calculate intereses_cesantias as monthly provision (12%/12)', () => {
        const result = payrollService.calculateProvisions(3000000, 175000, 3000000);
        const cesantias = (3000000 + 175000) * 0.0833;
        const expected = cesantias * (0.12 / 12);
        expect(result.intereses_cesantias).toBeCloseTo(expected, 0);
    });

    it('should sum total correctly', () => {
        const result = payrollService.calculateProvisions(3000000, 175000, 3000000);
        const expected = result.cesantias + result.intereses_cesantias + result.prima + result.vacaciones;
        expect(result.total).toBeCloseTo(expected, 2);
    });
});

// ─── Settlement ─────────────────────────────────────────────────────────────
describe('payrollService.calculateSettlement', () => {
    it('should calculate basic salary for full month (30 days)', () => {
        const emp = makeEmployee({ salary: 3000000 });
        const result = payrollService.calculateSettlement(emp, 30);

        const basicConcept = result.concepts.find(c => c.name === 'Sueldo Básico');
        expect(basicConcept?.amount).toBe(3000000);
    });

    it('should calculate proportional salary for partial month', () => {
        const emp = makeEmployee({ salary: 3000000 });
        const result = payrollService.calculateSettlement(emp, 15);

        const basicConcept = result.concepts.find(c => c.name === 'Sueldo Básico');
        expect(basicConcept?.amount).toBe(1500000);
    });

    it('should include transport allowance when salary <= 2 SMLV', () => {
        const emp = makeEmployee({ salary: PAYROLL_CONSTANTS.SMLV_2026 * 2, transport_allowance: true });
        const result = payrollService.calculateSettlement(emp, 30);

        const transport = result.concepts.find(c => c.name === 'Auxilio de Transporte');
        expect(transport).toBeDefined();
        expect(transport?.amount).toBe(PAYROLL_CONSTANTS.TRANSPORT_ALLOWANCE_2026);
    });

    it('should NOT include transport allowance when salary > 2 SMLV', () => {
        const emp = makeEmployee({ salary: PAYROLL_CONSTANTS.SMLV_2026 * 3, transport_allowance: true });
        const result = payrollService.calculateSettlement(emp, 30);

        const transport = result.concepts.find(c => c.name === 'Auxilio de Transporte');
        expect(transport).toBeUndefined();
    });

    it('should deduct active loans', () => {
        const emp = makeEmployee({ salary: 3000000 });
        const loan = makeLoan({ installment_amount: 500000 });
        const result = payrollService.calculateSettlement(emp, 30, [loan]);

        const loanDeduction = result.concepts.find(c => c.category === 'LOAN');
        expect(loanDeduction).toBeDefined();
        expect(loanDeduction?.amount).toBe(500000);
        expect(loanDeduction?.type).toBe('DEDUCTION');
    });

    it('should include benefits as earnings', () => {
        const emp = makeEmployee({ salary: 3000000 });
        const benefit = makeBenefit({ name: 'Auxilio Movilidad', amount: 200000 });
        const result = payrollService.calculateSettlement(emp, 30, [], [benefit]);

        const benefitEarning = result.concepts.find(c => c.name === 'Auxilio Movilidad');
        expect(benefitEarning).toBeDefined();
        expect(benefitEarning?.type).toBe('EARNING');
        expect(benefitEarning?.amount).toBe(200000);
    });

    it('should calculate health deduction at 4% of IBC', () => {
        const emp = makeEmployee({ salary: 3000000 });
        const result = payrollService.calculateSettlement(emp, 30);

        const health = result.concepts.find(c => c.name === 'Salud');
        expect(health?.amount).toBe(3000000 * 0.04);
    });

    it('should calculate pension deduction at 4% of IBC', () => {
        const emp = makeEmployee({ salary: 3000000 });
        const result = payrollService.calculateSettlement(emp, 30);

        const pension = result.concepts.find(c => c.name === 'Pensión');
        expect(pension?.amount).toBe(3000000 * 0.04);
    });

    it('should calculate net_pay = earnings - deductions', () => {
        const emp = makeEmployee({ salary: 3000000 });
        const result = payrollService.calculateSettlement(emp, 30);

        expect(result.net_pay).toBe(result.total_earnings - result.total_deductions);
    });

    it('should include overtime calculations when attendance provided', () => {
        const emp = makeEmployee({ salary: 3000000 });
        const attendance = { overtime: 10, night: 5, sunday: 3 };
        const result = payrollService.calculateSettlement(emp, 30, [], [], attendance);

        const overtimeDay = result.concepts.find(c => c.name === 'Horas Extra Diurnas');
        const overtimeNight = result.concepts.find(c => c.name === 'Horas Extra Nocturnas');
        const sundayHours = result.concepts.find(c => c.name === 'Horas Dominicales/Festivas');

        expect(overtimeDay).toBeDefined();
        expect(overtimeNight).toBeDefined();
        expect(sundayHours).toBeDefined();

        const hourValue = 3000000 / 240;
        expect(overtimeDay?.amount).toBeCloseTo(hourValue * 10 * 1.25, 0);
        expect(overtimeNight?.amount).toBeCloseTo(hourValue * 5 * 1.75, 0);
        expect(sundayHours?.amount).toBeCloseTo(hourValue * 3 * 2.0, 0);
    });
});

// ─── Final Settlement ───────────────────────────────────────────────────────
describe('payrollService.calculateFinalSettlement', () => {
    it('should calculate prima proportional to days', () => {
        const emp = makeEmployee({ salary: 3000000, transport_allowance: true });
        const result = payrollService.calculateFinalSettlement(
            emp, '2026-06-30', '2026-01-01', '2026-01-01', '2026-01-01'
        );

        expect(result.days.prima).toBeGreaterThan(0);
        expect(result.amounts.prima).toBeGreaterThan(0);
    });

    it('should calculate cesantias correctly', () => {
        const emp = makeEmployee({ salary: 3000000 });
        const result = payrollService.calculateFinalSettlement(
            emp, '2026-06-30', '2026-01-01', '2026-01-01', '2026-01-01'
        );

        // Base = salary + transport (3000000 <= 2 SMLV depends)
        expect(result.amounts.cesantias).toBeGreaterThan(0);
    });

    it('should calculate intereses on cesantias at 12% annual', () => {
        const emp = makeEmployee({ salary: 3000000 });
        const result = payrollService.calculateFinalSettlement(
            emp, '2026-06-30', '2026-01-01', '2026-01-01', '2026-01-01'
        );

        // intereses = cesantias * days * 0.12 / 360
        expect(result.amounts.intereses).toBeGreaterThan(0);
        expect(result.amounts.intereses).toBeLessThan(result.amounts.cesantias);
    });

    it('should calculate vacaciones on salary only (no transport)', () => {
        const emp = makeEmployee({ salary: 3000000 });
        const result = payrollService.calculateFinalSettlement(
            emp, '2026-06-30', '2026-01-01', '2026-01-01', '2026-01-01'
        );

        // vacaciones = salary * days / 720
        const days = result.days.vacaciones;
        const expected = (3000000 * days) / 720;
        expect(result.amounts.vacaciones).toBeCloseTo(expected, 0);
    });

    it('should sum total correctly', () => {
        const emp = makeEmployee({ salary: 3000000 });
        const result = payrollService.calculateFinalSettlement(
            emp, '2026-06-30', '2026-01-01', '2026-01-01', '2026-01-01'
        );

        const expected = result.amounts.prima + result.amounts.cesantias +
            result.amounts.intereses + result.amounts.vacaciones;
        expect(result.amounts.total).toBeCloseTo(expected, 2);
    });
});

// ─── Anomaly Detection ──────────────────────────────────────────────────────
describe('payrollService.detectAnomalies', () => {
    it('should return empty array for empty settlements', () => {
        expect(payrollService.detectAnomalies([])).toEqual([]);
    });

    it('should detect HIGH_NET_PAY when > 2.5x average', () => {
        const emp = makeEmployee({ salary: 3000000 });
        const normal = payrollService.calculateSettlement(emp, 30);
        // Need enough normal entries so average stays low, then one outlier
        const highPay = { ...normal, employee_id: 'emp-high', net_pay: normal.net_pay * 10 };

        const anomalies = payrollService.detectAnomalies([normal, normal, normal, normal, highPay]);
        expect(anomalies.some(a => a.type === 'HIGH_NET_PAY')).toBe(true);
    });

    it('should detect AGRESSIVE_LOAN_DEDUCTION when loans > 50% earnings', () => {
        const emp = makeEmployee({ salary: 2000000 });
        const bigLoan = makeLoan({ installment_amount: 1200000 });
        const settlement = payrollService.calculateSettlement(emp, 30, [bigLoan]);

        const anomalies = payrollService.detectAnomalies([settlement]);
        expect(anomalies.some(a => a.type === 'AGRESSIVE_LOAN_DEDUCTION')).toBe(true);
    });
});
