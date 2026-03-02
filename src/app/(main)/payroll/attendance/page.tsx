import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AttendanceDashboard } from '@/features/payroll/components/AttendanceDashboard';
import { AttendanceRecord } from '@/features/payroll/services/attendanceService';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveEmployee {
    id: string;
    full_name: string;
    position: string;
    department: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AttendancePage() {
    const supabase = await createClient();

    // Auth guard
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Current period bounds
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).toISOString().split('T')[0];

    // Parallel data fetching
    const [employeesResult, attendanceResult] = await Promise.all([
        supabase
            .from('employees')
            .select('id, full_name, position, department')
            .eq('status', 'ACTIVE')
            .order('full_name', { ascending: true }),
        supabase
            .from('payroll_attendance')
            .select(
                'id, employee_id, work_date, check_in, check_out, status, overtime_hours, night_hours, sunday_hours, notes'
            )
            .gte('work_date', firstDay)
            .lte('work_date', lastDay)
            .order('work_date', { ascending: true }),
    ]);

    const employees: ActiveEmployee[] = (employeesResult.data ?? []) as ActiveEmployee[];
    const records: AttendanceRecord[] = (attendanceResult.data ?? []) as AttendanceRecord[];

    return (
        <div className="p-6 md:p-10 space-y-8 max-w-[1800px] mx-auto">
            <Link
                href="/payroll"
                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors"
            >
                <ChevronLeft className="h-4 w-4" />
                Volver a Nómina
            </Link>

            <AttendanceDashboard
                employees={employees}
                records={records}
                year={year}
                month={month}
            />
        </div>
    );
}
