import { SupabaseClient } from '@supabase/supabase-js';
import {
    Employee,
    PayrollLoan,
    PayrollBenefit,
    PayrollConcept,
    PayrollSettlement,
    SocialSecuritySummary,
    ProvisionsSummary
} from '../types';

export const PAYROLL_CONSTANTS = {
    ANUAL_UVT: 49449, // Proyectada o real 2026
    SMLV_2026: 1450000,
    TRANSPORT_ALLOWANCE_2026: 175000,

    // Employee Rates
    HEALTH_RATE_EMPLOYEE: 0.04,
    PENSION_RATE_EMPLOYEE: 0.04,

    // Employer Rates
    HEALTH_RATE_EMPLOYER: 0.085, // Only if > 10 SMLV (Law 1607)
    PENSION_RATE_EMPLOYER: 0.12,

    // Parafiscales
    CCF_RATE: 0.04,
    SENA_RATE: 0.02, // Only if > 10 SMLV (Law 1607)
    ICBF_RATE: 0.03, // Only if > 10 SMLV (Law 1607)

    ARL_RATES: {
        '1': 0.00522,
        '2': 0.01044,
        '3': 0.02436,
        '4': 0.04350,
        '5': 0.06960
    },

    // SMLV Threshold for Law 1607 exemption
    EXEMPTION_THRESHOLD_SMLV: 10,

    // Prestaciones Sociales (Employer Provisions)
    CESANTIAS_RATE: 0.0833,
    INTERESES_CESANTIAS_RATE: 0.12, // Annual, applied on cesantías balance
    PRIMA_RATE: 0.0833,
    VACACIONES_RATE: 0.0417,

    // Overtime Rates (Colombia 2026)
    OVERTIME_RATES: {
        DAY: 1.25,
        NIGHT: 1.75,
        SUNDAY_DAY: 2.0,
        SUNDAY_NIGHT: 2.5,
        NIGHT_SURCHARGE: 0.35 // Recargo nocturno
    }
};


export const payrollService = {
    /**
     * Calcula los aportes de seguridad social y parafiscales (PILA)
     */
    calculateSocialSecuritySummary(salary: number, ibc: number, riskLevel: keyof typeof PAYROLL_CONSTANTS.ARL_RATES = '1'): SocialSecuritySummary {
        // Ley 1607/2012: Exoneración de Salud, SENA e ICBF para empleados < 10 SMLV
        const isExempt = salary < (PAYROLL_CONSTANTS.SMLV_2026 * PAYROLL_CONSTANTS.EXEMPTION_THRESHOLD_SMLV);

        // Employee Shares
        const empHealth = ibc * PAYROLL_CONSTANTS.HEALTH_RATE_EMPLOYEE;
        const empPension = ibc * PAYROLL_CONSTANTS.PENSION_RATE_EMPLOYEE;

        // Employer Shares
        const empyHealth = isExempt ? 0 : (ibc * PAYROLL_CONSTANTS.HEALTH_RATE_EMPLOYER);
        const empyPension = ibc * PAYROLL_CONSTANTS.PENSION_RATE_EMPLOYER;
        const arlRate = PAYROLL_CONSTANTS.ARL_RATES[riskLevel] || PAYROLL_CONSTANTS.ARL_RATES['1'];
        const empyArl = ibc * arlRate;

        // Parafiscales
        const ccf = ibc * PAYROLL_CONSTANTS.CCF_RATE;
        const sena = isExempt ? 0 : (ibc * PAYROLL_CONSTANTS.SENA_RATE);
        const icbf = isExempt ? 0 : (ibc * PAYROLL_CONSTANTS.ICBF_RATE);

        return {
            ibc,
            employee: {
                health: empHealth,
                pension: empPension,
                total: empHealth + empPension
            },
            employer: {
                health: empyHealth,
                pension: empyPension,
                arl: empyArl,
                total: empyHealth + empyPension + empyArl
            },
            parafiscales: {
                ccf,
                sena,
                icbf,
                total: ccf + sena + icbf
            },
            total_cost: empyHealth + empyPension + empyArl + ccf + sena + icbf
        };
    },

    /**
     * Calcula las provisiones mensuales de prestaciones sociales (Costo Empresa)
     */
    calculateProvisions(salary: number, transportAllowance: number, ibc: number): ProvisionsSummary {
        // Base para Cesantías, Intereses y Prima: IBC (Sueldo + Beneficios Salariales) + Auxilio Transporte
        const basePrestaciones = ibc + transportAllowance;

        // Base para Vacaciones: Solo IBC (No incluye auxilio transporte)
        const baseVacaciones = ibc;

        const cesantias = basePrestaciones * PAYROLL_CONSTANTS.CESANTIAS_RATE;
        const intereses = cesantias * (PAYROLL_CONSTANTS.INTERESES_CESANTIAS_RATE / 12); // Provisión mensual
        const prima = basePrestaciones * PAYROLL_CONSTANTS.PRIMA_RATE;
        const vacaciones = baseVacaciones * PAYROLL_CONSTANTS.VACACIONES_RATE;

        return {
            cesantias,
            intereses_cesantias: intereses,
            prima,
            vacaciones,
            total: cesantias + intereses + prima + vacaciones
        };
    },

    /**
     * Calcula la liquidación de nómina según ley colombiana (Contexto 2026)
     */
    calculateSettlement(
        employee: Employee,
        daysWorked: number = 30,
        activeLoans: PayrollLoan[] = [],
        activeBenefits: PayrollBenefit[] = [],
        attendanceSummary?: { overtime: number; night: number; sunday: number }
    ): PayrollSettlement {
        const baseSalary = Number(employee.salary);
        const salaryPerDay = baseSalary / 30;
        const workedSalary = (salaryPerDay * daysWorked);

        const concepts: PayrollConcept[] = [];

        // 1. Sueldo Básico (Proporcional a días trabajados)
        concepts.push({
            name: 'Sueldo Básico',
            type: 'EARNING',
            amount: workedSalary,
            description: `Días trabajados: ${daysWorked}`,
            category: 'BASIC'
        });

        // 2. Auxilio de Transporte
        if (employee.transport_allowance && baseSalary <= (PAYROLL_CONSTANTS.SMLV_2026 * 2)) {
            const transportProportional = (PAYROLL_CONSTANTS.TRANSPORT_ALLOWANCE_2026 / 30) * daysWorked;
            concepts.push({
                name: 'Auxilio de Transporte',
                type: 'EARNING',
                amount: transportProportional,
                description: 'Auxilio legal de transporte',
                category: 'TRANSPORT'
            });
        }

        // 3. Beneficios Extra-Legales (Earnings)
        let totalBenefitsSalary = 0;
        activeBenefits.forEach(benefit => {
            const amount = benefit.frequency === 'MONTHLY' ? (benefit.amount / 30 * daysWorked) : benefit.amount;
            concepts.push({
                name: benefit.name,
                type: 'EARNING',
                amount: amount,
                description: benefit.is_salary ? 'Beneficio Salarial' : 'Beneficio No Salarial',
                category: 'BENEFIT'
            });
            if (benefit.is_salary) totalBenefitsSalary += amount;
        });

        // 3.5 Horas Extra (Overtime)
        if (attendanceSummary) {
            const hourValue = baseSalary / 240; // 240 hours per month standard

            if (attendanceSummary.overtime > 0) {
                const amount = hourValue * attendanceSummary.overtime * PAYROLL_CONSTANTS.OVERTIME_RATES.DAY;
                concepts.push({
                    name: 'Horas Extra Diurnas',
                    type: 'EARNING',
                    amount,
                    description: `Cant: ${attendanceSummary.overtime}h`,
                    category: 'OVERTIME'
                });
                totalBenefitsSalary += amount;
            }

            if (attendanceSummary.night > 0) {
                const amount = hourValue * attendanceSummary.night * PAYROLL_CONSTANTS.OVERTIME_RATES.NIGHT;
                concepts.push({
                    name: 'Horas Extra Nocturnas',
                    type: 'EARNING',
                    amount,
                    description: `Cant: ${attendanceSummary.night}h`,
                    category: 'OVERTIME'
                });
                totalBenefitsSalary += amount;
            }

            if (attendanceSummary.sunday > 0) {
                const amount = hourValue * attendanceSummary.sunday * PAYROLL_CONSTANTS.OVERTIME_RATES.SUNDAY_DAY;
                concepts.push({
                    name: 'Horas Dominicales/Festivas',
                    type: 'EARNING',
                    amount,
                    description: `Cant: ${attendanceSummary.sunday}h`,
                    category: 'OVERTIME'
                });
                totalBenefitsSalary += amount;
            }
        }

        // 4. Deducciones de Préstamos (Deductions)
        activeLoans.forEach(loan => {
            if (loan.status === 'ACTIVE') {
                concepts.push({
                    name: `Préstamo: ${loan.description || 'General'}`,
                    type: 'DEDUCTION',
                    amount: loan.installment_amount,
                    description: `Cuota de préstamo (${loan.installments_paid + 1}/${loan.installment_count})`,
                    category: 'LOAN'
                });
            }
        });

        // 5. Deducciones de Ley (Sobre IBC - Ingreso Base de Cotización)
        // El IBC para salud y pensión incluye sueldo básico + beneficios salariales
        const ibc = workedSalary + totalBenefitsSalary;
        const ssSummary = this.calculateSocialSecuritySummary(baseSalary, ibc, (employee.risk_level as any) || '1');

        // Salud (4%)
        concepts.push({
            name: 'Salud',
            type: 'DEDUCTION',
            amount: ssSummary.employee.health,
            description: `Aporte salud (${PAYROLL_CONSTANTS.HEALTH_RATE_EMPLOYEE * 100}%)`,
            category: 'HEALTH'
        });

        // Pensión (4%)
        concepts.push({
            name: 'Pensión',
            type: 'DEDUCTION',
            amount: ssSummary.employee.pension,
            description: `Aporte pensión (${PAYROLL_CONSTANTS.PENSION_RATE_EMPLOYEE * 100}%)`,
            category: 'PENSION'
        });

        // 6. Provisiones (Costo Oculto Empresa)
        const transportAmt = concepts.find(c => c.category === 'TRANSPORT')?.amount || 0;
        const provisions = this.calculateProvisions(baseSalary, transportAmt, ibc);

        // 7. Totales
        const total_earnings = concepts
            .filter(c => c.type === 'EARNING')
            .reduce((sum, c) => sum + c.amount, 0);

        const total_deductions = concepts
            .filter(c => c.type === 'DEDUCTION')
            .reduce((sum, c) => sum + c.amount, 0);

        const net_pay = total_earnings - total_deductions;

        return {
            employee_id: employee.id!,
            period_start: new Date().toISOString().split('T')[0],
            period_end: new Date().toISOString().split('T')[0],
            salary_base: baseSalary,
            concepts,
            total_earnings,
            total_deductions,
            net_pay,
            social_security: ssSummary,
            provisions
        };
    },

    /**
     * Calcula la liquidación definitiva por terminación de contrato
     */
    calculateFinalSettlement(
        employee: Employee,
        endDate: string,
        lastPrimaDate: string,
        lastVacationsDate: string,
        lastCesantiasDate: string
    ) {
        const salary = Number(employee.salary);
        const transportAllowance = salary <= (PAYROLL_CONSTANTS.SMLV_2026 * 2) ? PAYROLL_CONSTANTS.TRANSPORT_ALLOWANCE_2026 : 0;
        const basePrestaciones = salary + transportAllowance;

        const dateEnd = new Date(endDate);

        const getDays = (start: string, end: string) => {
            const s = new Date(start);
            const e = new Date(end);
            return Math.max(0, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        };

        const daysPrima = getDays(lastPrimaDate, endDate);
        const daysCesantias = getDays(lastCesantiasDate, endDate);
        const daysVacations = getDays(lastVacationsDate, endDate);

        const valPrima = (basePrestaciones * daysPrima) / 360;
        const valCesantias = (basePrestaciones * daysCesantias) / 360;
        const valIntereses = (valCesantias * daysCesantias * 0.12) / 360;
        const valVacations = (salary * daysVacations) / 720;

        return {
            days: { prima: daysPrima, cesantias: daysCesantias, vacaciones: daysVacations },
            amounts: {
                prima: valPrima,
                cesantias: valCesantias,
                intereses: valIntereses,
                vacaciones: valVacations,
                total: valPrima + valCesantias + valIntereses + valVacations
            }
        };
    },

    async createPayrollDocument(client: SupabaseClient, settlement: PayrollSettlement, tenantId: string) {
        // Obtenemos los datos del empleado para mapear al Tercero (Party)
        const { data: employeeData, error: empError } = await client
            .from('employees')
            .select('party_id')
            .eq('id', settlement.employee_id)
            .single();

        if (empError) throw empError;

        // 1. Crear Cabecera de Documento
        const { data: doc, error: docError } = await client
            .from('documents')
            .insert({
                tenant_id: tenantId,
                doc_type: 'PAYROLL',
                number: `NOM-${Date.now()}`,
                party_id: employeeData.party_id,
                issue_date: new Date().toISOString().split('T')[0],
                total: settlement.net_pay,
                status: 'DRAFT',
                notes_public: `Liquidación del periodo ${settlement.period_start} al ${settlement.period_end}`
            })
            .select()
            .single();

        if (docError) throw docError;

        // 2. Crear Líneas de Documento (Conceptos)
        const lines = settlement.concepts.map(c => ({
            tenant_id: tenantId,
            document_id: doc.id,
            description: c.name,
            qty: 1,
            unit_price: c.type === 'EARNING' ? c.amount : -c.amount,
            line_total: c.type === 'EARNING' ? c.amount : -c.amount,
        }));

        const { error: linesError } = await client
            .from('document_lines')
            .insert(lines);

        if (linesError) throw linesError;

        return doc;
    },

    /**
     * Detecta anomalías en un lote de liquidaciones
     */
    detectAnomalies(settlements: PayrollSettlement[]) {
        const anomalies: { employee_id: string; type: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; message: string }[] = [];

        if (settlements.length === 0) return anomalies;

        const avgNetPay = settlements.reduce((sum, s) => sum + s.net_pay, 0) / settlements.length;

        settlements.forEach(s => {
            // 1. Salario Neto Muy Alto
            if (s.net_pay > avgNetPay * 2.5) {
                anomalies.push({
                    employee_id: s.employee_id,
                    type: 'HIGH_NET_PAY',
                    severity: 'HIGH',
                    message: `Pago neto (${s.net_pay.toLocaleString()}) es significativamente superior al promedio.`
                });
            }

            // 2. Exceso de beneficios
            const salaryBenefits = s.concepts.filter(c => c.category === 'BENEFIT' && c.type === 'EARNING');
            if (salaryBenefits.length > 5) {
                anomalies.push({
                    employee_id: s.employee_id,
                    type: 'EXCESSIVE_BENEFITS',
                    severity: 'MEDIUM',
                    message: `Se detectaron más de 5 beneficios extralegales activos.`
                });
            }

            // 3. Deducciones de préstamo agresivas
            const loanDeductions = s.concepts.filter(c => c.category === 'LOAN' && c.type === 'DEDUCTION');
            const totalLoanDeductions = loanDeductions.reduce((sum, c) => sum + c.amount, 0);
            if (totalLoanDeductions > s.total_earnings * 0.5) {
                anomalies.push({
                    employee_id: s.employee_id,
                    type: 'AGRESSIVE_LOAN_DEDUCTION',
                    severity: 'HIGH',
                    message: `Las deducciones por préstamos superan el 50% de los ingresos totales.`
                });
            }
        });

        return anomalies;
    }
};
