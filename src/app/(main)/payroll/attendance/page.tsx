import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { AttendanceDashboard } from '@/features/payroll/components/AttendanceDashboard';
import { AttendancePunchLog, type PunchRow } from '@/features/payroll/components/AttendancePunchLog';
import { AttendanceRecord } from '@/features/payroll/services/attendanceService';
import { Button } from '@/shared/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { resolvePartyRow, resolveEmployeeName, contractLabel, type PartyRow } from '@/features/payroll/utils/carnetHelpers';

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
        // `employees` NO tiene full_name/position/department: el nombre vive en
        // `parties`. Con aquel select la consulta fallaba y la lista de empleados
        // salía SIEMPRE vacía (control de asistencia en blanco).
        supabase
            .from('employees')
            .select('id, contract_type, parties(legal_name)')
            .eq('status', 'ACTIVE'),
        supabase
            .from('payroll_attendance')
            .select(`
                id, employee_id, work_date, check_in, check_out, status,
                overtime_hours, night_hours, sunday_hours, late_minutes, notes,
                check_in_terminal_id, check_out_terminal_id,
                check_in_mode, remote_reason, early_leave_reason,
                check_in_terminal:kiosk_terminals!check_in_terminal_id(name),
                check_out_terminal:kiosk_terminals!check_out_terminal_id(name)
            `)
            .gte('work_date', firstDay)
            .lte('work_date', lastDay)
            .order('work_date', { ascending: true }),
    ]);

    const employees: ActiveEmployee[] = (employeesResult.data ?? [])
        .map((e) => {
            const party = resolvePartyRow(
                (e as { parties?: unknown }).parties as PartyRow | PartyRow[] | null
            );
            return {
                id: (e as { id: string }).id,
                full_name: resolveEmployeeName(party),
                position: contractLabel((e as { contract_type?: string }).contract_type || ''),
                department: contractLabel((e as { contract_type?: string }).contract_type || ''),
            };
        })
        .sort((a, b) => a.full_name.localeCompare(b.full_name));
    const records: AttendanceRecord[] = (attendanceResult.data ?? []) as unknown as AttendanceRecord[];

    // Reporte de marcaciones: solo jornadas con entrada registrada, de la más
    // reciente a la más antigua. `resolveTerminal` cubre el quirk de PostgREST,
    // que devuelve la relación como objeto o como array según el caso.
    const employeeName = new Map(employees.map(e => [e.id, e.full_name]));
    const resolveTerminal = (value: unknown): string | null => {
        const row = Array.isArray(value) ? value[0] : value;
        return (row as { name?: string } | null)?.name ?? null;
    };

    const punches: PunchRow[] = (attendanceResult.data ?? [])
        .filter(r => !!(r as { check_in?: string }).check_in)
        .map(r => {
            const rec = r as unknown as AttendanceRecord & {
                check_in_terminal?: unknown;
                check_out_terminal?: unknown;
            };
            return {
                ...rec,
                employee_name: employeeName.get(rec.employee_id) ?? 'Empleado',
                check_in_terminal_name: resolveTerminal(rec.check_in_terminal),
                check_out_terminal_name: resolveTerminal(rec.check_out_terminal),
            };
        })
        .sort((a, b) => b.work_date.localeCompare(a.work_date));

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

            <AttendancePunchLog rows={punches} />
        </div>
    );
}
