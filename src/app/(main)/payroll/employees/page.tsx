import { createClient } from '@/lib/supabase/server';
import { employeeService } from '@/features/payroll/services/employeeService';
import { EmployeeList } from '@/features/payroll/components/EmployeeList';
import { redirect } from 'next/navigation';
import { Clock, ShieldCheck } from "lucide-react";

export default async function EmployeesPage() {
    const supabase = await createClient();

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    let employees: any[] = [];
    let errorMsg = null;

    try {
        employees = await employeeService.getEmployees(supabase);
    } catch (e: any) {
        console.error("Error fetching employees:", JSON.stringify(e, null, 2));

        if (
            e?.code === '42P01' ||
            e?.code === 'PGRST205' ||
            e?.message?.includes('relation "employees" does not exist') ||
            e?.message?.includes('Could not find the table')
        ) {
            errorMsg = "La tabla 'employees' no existe. Por favor ejecuta el SQL de migración.";
        } else {
            errorMsg = `Error cargando empleados: ${e?.message || JSON.stringify(e)}`;
        }
    }

    if (errorMsg) {
        return (
            <div className="container mx-auto py-12 px-4 italic">
                <div className="bg-rose-50 text-rose-600 p-8 rounded-[2rem] border-none shadow-premium">
                    <h3 className="text-2xl font-black tracking-tighter mb-2">Error de Sincronización</h3>
                    <p className="text-sm font-bold uppercase tracking-widest opacity-60">{errorMsg}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000 container mx-auto py-12 px-4">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Colaboradores</h1>
                    <div className="flex items-center gap-4">
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Base de Datos de Capital Humano</p>
                        <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-full">
                            <ShieldCheck className="h-3 w-3 text-indigo-600" />
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Estructura Certificada</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-[1.5rem] shadow-premium">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                        <Clock className="h-5 w-5" />
                    </div>
                    <div className="pr-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Corte Actual</p>
                        <p className="text-sm font-black text-slate-900 italic">Febrero 17, 2026</p>
                    </div>
                </div>
            </div>

            <EmployeeList employees={employees} />
        </div>
    );
}
