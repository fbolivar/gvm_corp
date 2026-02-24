import { SupabaseClient } from '@supabase/supabase-js';
import { PayrollLoan, PayrollBenefit } from '../types';

export const financeService = {
    // LOANS
    async getEmployeeLoans(client: SupabaseClient, employeeId: string) {
        const { data, error } = await client
            .from('payroll_loans')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('status', 'ACTIVE');

        if (error) throw error;
        return data as PayrollLoan[];
    },

    async createLoan(client: SupabaseClient, loan: Omit<PayrollLoan, 'id' | 'created_at'>) {
        const { data, error } = await client
            .from('payroll_loans')
            .insert(loan)
            .select()
            .single();

        if (error) throw error;
        return data as PayrollLoan;
    },

    // BENEFITS
    async getEmployeeBenefits(client: SupabaseClient, employeeId: string) {
        const { data, error } = await client
            .from('payroll_benefits')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('status', 'ACTIVE');

        if (error) throw error;
        return data as PayrollBenefit[];
    },

    async createBenefit(client: SupabaseClient, benefit: Omit<PayrollBenefit, 'id' | 'created_at'>) {
        const { data, error } = await client
            .from('payroll_benefits')
            .insert(benefit)
            .select()
            .single();

        if (error) throw error;
        return data as PayrollBenefit;
    }
};
