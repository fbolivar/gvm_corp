import { createClient } from '@/lib/supabase/server';
import { employeeService } from '@/features/payroll/services/employeeService';
import { settingsService } from '@/features/settings/services/settingsService';
import { EmployeeList } from '@/features/payroll/components/EmployeeList';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default async function EmployeesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    let employees: Awaited<ReturnType<typeof employeeService.getEmployees>> = [];
    let errorMsg = null;

    const [tenant] = await Promise.all([
        settingsService.getTenantInfo(supabase),
        employeeService.getEmployees(supabase)
            .then(r => { employees = r; })
            .catch((e: unknown) => {
                const err = e as { code?: string; message?: string };
                if (
                    err?.code === '42P01' ||
                    err?.code === 'PGRST205' ||
                    err?.message?.includes('relation "employees" does not exist') ||
                    err?.message?.includes('Could not find the table')
                ) {
                    errorMsg = "La tabla 'employees' no existe. Por favor ejecuta el SQL de migracion.";
                } else {
                    errorMsg = `Error cargando empleados: ${err?.message || 'Desconocido'}`;
                }
            }),
    ]);

    if (errorMsg) {
        return (
            <div className="page-container py-12">
                <Card className="rounded-2xl border border-rose-100 bg-rose-50 shadow-sm">
                    <CardContent className="p-6 flex items-start gap-4">
                        <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-bold text-rose-700 mb-1">Error de Sincronizacion</h3>
                            <p className="text-xs text-rose-600">{errorMsg}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl">
                    <Link href="/payroll"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1">
                    <VisualReportHeader
                        title="Colaboradores"
                        subtitle="Base de datos de capital humano"
                        tenant={tenant}
                    />
                </div>
            </div>

            <EmployeeList employees={employees} />
        </div>
    );
}
