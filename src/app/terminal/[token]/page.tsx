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
        .select('legal_name, nit')
        .eq('id', terminal.tenant_id)
        .maybeSingle()

    // 3. Get all active employees for this tenant (for local name lookup after scan)
    const { data: employees } = await adminClient
        .from('employees')
        .select('id, party:parties(legal_name)')
        .eq('tenant_id', terminal.tenant_id)
        .eq('status', 'ACTIVE')

    const employeeList = (employees || []).map(emp => {
        const party = emp.party as unknown as { legal_name: string } | { legal_name: string }[] | null
        const name = Array.isArray(party) ? party[0]?.legal_name : party?.legal_name
        return { id: emp.id, name: name || 'Sin nombre' }
    })

    return (
        <KioskTerminal
            token={token}
            terminalName={terminal.name}
            tenantName={tenant?.legal_name || 'GVM Corp'}
            employees={employeeList}
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
