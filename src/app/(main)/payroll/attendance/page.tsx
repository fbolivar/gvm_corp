import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { AttendanceDashboard } from '@/features/payroll/components/AttendanceDashboard';
import { AttendanceRecord } from '@/features/payroll/services/attendanceService';
import { Button } from '@/shared/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface ActiveEmployee {
    id: string;
    full_name: string;
    position: string;
    department: string;
}

export default async function AttendancePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).toISOString().split('T')[0];

    const [tenant, employeesResult, attendanceResult] = await Promise.all([
        settingsService.getTenantInfo(supabase),
        supabase
            .from('employees')
            .select('id, full_name, position, department')
            .eq('status', 'ACTIVE')
            .order('full_name', { ascending: true }),
        supabase
            .from('payroll_attendance')
            .select('id, employee_id, work_date, check_in, check_out, status, overtime_hours, night_hours, sunday_hours, notes')
            .gte('work_date', firstDay)
            .lte('work_date', lastDay)
            .order('work_date', { ascending: true }),
    ]);

    const employees: ActiveEmployee[] = (employeesResult.data ?? []) as ActiveEmployee[];
    const records: AttendanceRecord[] = (attendanceResult.data ?? []) as AttendanceRecord[];

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl">
                    <Link href="/payroll"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1">
                    <VisualReportHeader
                        title="Control de Asistencia"
                        subtitle="Registro de jornada y novedades del periodo"
                        tenant={tenant}
                    />
                </div>
            </div>

            <AttendanceDashboard
                employees={employees}
                records={records}
                year={year}
                month={month}
            />
        </div>
    );
}
