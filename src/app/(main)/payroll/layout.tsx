import { canViewModule } from '@/shared/lib/moduleGuard'
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'

/**
 * Guard del módulo de Nómina (cubre las 15 pantallas: empleados, liquidación,
 * consolidada, dispersión, etc.).
 *
 * No usa <ModuleGate> genérico porque el mensaje aquí ofrece la salida útil para
 * un empleado sin permiso: su propio portal en /my-payroll (que NO pasa por aquí).
 */
export default async function PayrollLayout({ children }: { children: React.ReactNode }) {
    const allowed = await canViewModule('payroll')

    if (!allowed) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-6">
                <div className="h-16 w-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                    <ShieldAlert className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Acceso restringido</h1>
                    <p className="text-slate-400 text-sm max-w-md">
                        No tienes permiso para acceder al módulo de Nómina. Si necesitas entrar,
                        solicítalo a Gestión Humana.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/my-payroll"
                        className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center transition-colors"
                    >
                        Ir a Mi Nómina
                    </Link>
                    <Link
                        href="/dashboard"
                        className="h-10 px-5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold inline-flex items-center transition-colors"
                    >
                        Volver al inicio
                    </Link>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
