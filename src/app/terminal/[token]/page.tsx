import { createAdminClient } from '@/lib/supabase/admin'
import { KioskTerminal } from '@/features/payroll/components/KioskTerminal'
import { AlertCircle } from 'lucide-react'

interface PageProps {
    params: Promise<{ token: string }>
}

export default async function TerminalPage({ params }: PageProps) {
    const { token } = await params
    const adminClient = createAdminClient()

    // 1. Find terminal by token
    const { data: terminal, error: termError } = await adminClient
        .from('kiosk_terminals')
        .select('id, tenant_id, name, is_active, expires_at')
        .eq('token', token)
        .maybeSingle()

    if (termError || !terminal) {
        return <ErrorScreen message="Terminal no encontrado. Verifica que el enlace sea correcto." />
    }

    if (!terminal.is_active) {
        return <ErrorScreen message="Este terminal ha sido desactivado por el administrador." />
    }

    if (terminal.expires_at && new Date(terminal.expires_at) < new Date()) {
        return <ErrorScreen message="Este terminal ha expirado. Solicita uno nuevo al administrador." />
    }

    // 2. Get tenant info
    const { data: tenant } = await adminClient
        .from('tenants')
        // La empresa se llama `name` en `tenants` (legal_name es de parties):
        // con legal_name la consulta fallaba y siempre salía el nombre por defecto.
        .select('legal_name:name, nit')
        .eq('id', terminal.tenant_id)
        .maybeSingle()

    // 3. Solo el CONTEO de empleados activos.
    //
    // Antes se enviaba al navegador la lista completa (id + nombre de los 39
    // empleados) para mostrar el nombre mientras se procesaba el escaneo. Esta
    // página es pública —basta el enlace, no hay sesión— así que cualquiera con
    // la URL se llevaba el directorio del personal. El nombre real ya lo
    // devuelve /api/kiosk/clock después de validar la firma del QR.
    const { count: employeeCount } = await adminClient
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', terminal.tenant_id)
        .eq('status', 'ACTIVE')

    return (
        <KioskTerminal
            token={token}
            terminalName={terminal.name}
            tenantName={tenant?.legal_name || 'GVM Corp'}
            employeeCount={employeeCount ?? 0}
        />
    )
}

function ErrorScreen({ message }: { message: string }) {
    return (
        <main className="flex-1 flex flex-col items-center justify-center py-16 px-4">
            <div className="w-full max-w-sm text-center space-y-6">
                <div className="h-20 w-20 rounded-full bg-red-900/30 flex items-center justify-center border-4 border-red-800/30 mx-auto">
                    <AlertCircle className="h-10 w-10 text-red-400" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-xl font-black text-white">Terminal No Disponible</h1>
                    <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
                </div>
            </div>
        </main>
    )
}
