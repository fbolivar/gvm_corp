import { createClient } from '@/lib/supabase/server';
import { employeeService } from '@/features/payroll/services/employeeService';
import { EmployeeList } from '@/features/payroll/components/EmployeeList';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { UsersRound, Plus, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/shared/components/ui/page-header';

export default async function EmployeesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    let employees: Awaited<ReturnType<typeof employeeService.getEmployees>> = [];
    let errorMsg = null;

    await employeeService.getEmployees(supabase)
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
        });

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
            <PageHeader
                title="Empleados"
                description="Directorio del personal activo."
                icon={UsersRound}
                breadcrumbs={[
                    { label: 'Inicio', href: '/dashboard' },
                    { label: 'Nómina', href: '/payroll' },
                    { label: 'Empleados' },
                ]}
                actions={
                    <Button asChild size="sm" className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs gap-2">
                        <Link href="/payroll/employees/new">
                            <Plus className="h-3.5 w-3.5" />
                            Nuevo empleado
                        </Link>
                    </Button>
                }
            />

            <EmployeeList employees={employees} />
        </div>
    );
}
