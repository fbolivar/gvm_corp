import { createClient } from '@/lib/supabase/server';
import { employeeService } from '@/features/payroll/services/employeeService';
import { overtimeService } from '@/features/payroll/services/overtimeService';
import { PayrollDashboard } from '@/features/payroll/components/PayrollDashboard';
import { OvertimeApprovalPanel } from '@/features/payroll/components/OvertimeApprovalPanel';
import { redirect } from 'next/navigation';

export default async function PayrollPage() {
    const supabase = await createClient();

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // Get tenant for this user
    const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

    const tenantId = userTenant?.tenant_id as string | undefined;

    // Fetch employees + overtime requests in parallel
    let employees: any[] = [];
    let pendingOvertimeRequests: any[] = [];
    let allOvertimeRequests: any[] = [];

    await Promise.all([
        employeeService.getEmployees(supabase).then(r => { employees = r; }).catch(console.error),
        tenantId
            ? overtimeService.getPendingRequests(supabase, tenantId).then(r => { pendingOvertimeRequests = r; }).catch(console.error)
            : Promise.resolve(),
        tenantId
            ? overtimeService.getAllRequests(supabase, tenantId).then(r => { allOvertimeRequests = r; }).catch(console.error)
            : Promise.resolve(),
    ]);

    const stats = {
        totalEmployees: employees.length,
        activeEmployees: employees.filter((e: any) => e.status === 'ACTIVE').length,
        lastSettlementDate: null,
        lastSettlementAmount: 0,
    };

    return (
        <div className="space-y-12 pb-20">
            <PayrollDashboard stats={stats} />
            <OvertimeApprovalPanel
                pendingRequests={pendingOvertimeRequests}
                allRequests={allOvertimeRequests}
            />
        </div>
    );
}
