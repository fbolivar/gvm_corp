import { createClient } from '@/lib/supabase/server';
import { employeeService } from '@/features/payroll/services/employeeService';
import { PayrollDashboard } from '@/features/payroll/components/PayrollDashboard';
import { redirect } from 'next/navigation';

export default async function PayrollPage() {
    const supabase = await createClient();

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // Fetch stats for dashboard
    let employees: any[] = [];
    try {
        employees = await employeeService.getEmployees(supabase);
    } catch (e) {
        console.error("Error fetching employees", e);
    }

    const stats = {
        totalEmployees: employees.length,
        activeEmployees: employees.filter((e: any) => e.status === 'ACTIVE').length,
        lastSettlementDate: null,
        lastSettlementAmount: 0 // In future fetch from a settlement table
    };

    return (
        <div className="space-y-12 pb-20">
            <PayrollDashboard stats={stats} />
        </div>
    );
}
