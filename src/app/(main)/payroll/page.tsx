import { createClient } from '@/lib/supabase/server';
import { employeeService } from '@/features/payroll/services/employeeService';
import { overtimeService } from '@/features/payroll/services/overtimeService';
import { settingsService } from '@/features/settings/services/settingsService';
import { PayrollDashboard } from '@/features/payroll/components/PayrollDashboard';
import { OvertimeApprovalPanel } from '@/features/payroll/components/OvertimeApprovalPanel';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { OvertimeRequest } from '@/features/payroll/types';
import { redirect } from 'next/navigation';

export default async function PayrollPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

    const tenantId = userTenant?.tenant_id as string | undefined;

    let employees: unknown[] = [];
    let pendingOvertimeRequests: OvertimeRequest[] = [];
    let allOvertimeRequests: OvertimeRequest[] = [];

    const [tenant] = await Promise.all([
        settingsService.getTenantInfo(supabase),
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
        activeEmployees: employees.filter((e: unknown) => (e as { status?: string }).status === 'ACTIVE').length,
        lastSettlementDate: null,
        lastSettlementAmount: 0,
    };

    return (
        <div className="page-container space-y-8 pb-20 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Control de Nomina"
                subtitle="Liquidaciones, RRHH y gestion de talento humano"
                tenant={tenant}
            />
            <PayrollDashboard stats={stats} />
            <OvertimeApprovalPanel
                pendingRequests={pendingOvertimeRequests}
                allRequests={allOvertimeRequests}
            />
        </div>
    );
}
