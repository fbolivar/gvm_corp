import { canViewModule } from '@/shared/lib/moduleGuard'
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'

/**
 * Bloquea un módulo completo del lado del SERVIDOR según role_permissions.
 *
 * Contexto (auditoría 2026-07-16): los permisos de módulo solo ocultaban enlaces
 * del sidebar; las páginas no los verificaban, así que cualquiera podía entrar
 * escribiendo la URL. Este componente hace que el permiso signifique algo.
 *
 * Uso en el layout del módulo:
 *   export default function Layout({ children }) {
 *     return <ModuleGate moduleKey="treasury">{children}</ModuleGate>
 *   }
 *
 * OJO: no aplicar en /dashboard (todos aterrizan ahí tras el login) ni en
 * /settings (contiene preferencias personales de cualquier usuario).
 */
export async function ModuleGate({
    moduleKey,
    children,
}: {
    moduleKey: string
    children: React.ReactNode
}) {
    if (await canViewModule(moduleKey)) return <>{children}</>

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-6">
            <div className="h-16 w-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                <ShieldAlert className="h-8 w-8" />
            </div>
            <div className="space-y-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Acceso restringido</h1>
                <p className="text-slate-400 text-sm max-w-md">
                    No tienes permiso para acceder a este módulo. Si necesitas entrar, solicítalo
                    al administrador.
                </p>
            </div>
            <Link
                href="/dashboard"
                className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center transition-colors"
            >
                Volver al inicio
            </Link>
        </div>
    )
}
