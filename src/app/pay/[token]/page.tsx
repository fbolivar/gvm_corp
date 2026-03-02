import { createAdminClient } from '@/lib/supabase/admin'
import { PaymentForm } from '@/features/payments/components/PaymentForm'
import type { PublicPaymentLinkData } from '@/features/payments/types'
import { AlertCircle, CheckCircle2, Clock, Shield } from 'lucide-react'

interface PageProps {
    params: Promise<{ token: string }>
}

/**
 * Pagina publica de pago — NO requiere autenticacion.
 * Accede via /pay/[token]
 * Usa el admin client (SERVICE_ROLE_KEY) para leer el link sin RLS.
 */
export default async function PayTokenPage({ params }: PageProps) {
    const { token } = await params
    const adminClient = createAdminClient()

    // Buscar el payment link con datos relacionados del documento y tenant
    const { data: rawLink, error: linkError } = await adminClient
        .from('payment_links')
        .select(`
            id,
            token,
            amount,
            currency,
            status,
            expires_at,
            document_id,
            tenant_id,
            document:documents (
                id,
                number,
                doc_type,
                issue_date,
                party:parties (
                    legal_name,
                    doc_number
                )
            )
        `)
        .eq('token', token)
        .maybeSingle()

    // Error de base de datos
    if (linkError) {
        console.error('[pay/[token]] Error DB:', linkError)
        return <ErrorScreen message="Ocurrio un error al consultar el link. Intenta de nuevo mas tarde." />
    }

    // Token no encontrado
    if (!rawLink) {
        return (
            <ErrorScreen message="Link de pago no encontrado. Verifica que el enlace sea correcto o solicita uno nuevo." />
        )
    }

    // Verificar expiracion
    const isExpired = new Date(rawLink.expires_at) < new Date()

    if (isExpired && rawLink.status === 'PENDING') {
        // Marcar como expirado en background (best-effort, fire-and-forget)
        void adminClient
            .from('payment_links')
            .update({ status: 'EXPIRED' })
            .eq('id', rawLink.id)
    }

    // Link cancelado
    if (rawLink.status === 'CANCELLED') {
        return <ErrorScreen message="Este link de pago fue cancelado. Contacta al emisor para obtener uno nuevo." />
    }

    // Link expirado
    if (rawLink.status === 'EXPIRED' || isExpired) {
        return (
            <StatusScreen
                icon="expired"
                title="Link Vencido"
                message="Este link de pago ha expirado (validez 72 horas). Contacta al emisor para solicitar un nuevo link."
            />
        )
    }

    // Pago ya realizado
    if (rawLink.status === 'PAID') {
        return (
            <StatusScreen
                icon="paid"
                title="Pago Ya Registrado"
                message="Este pago ya fue procesado exitosamente. No es necesario realizar ningun pago adicional."
            />
        )
    }

    // Obtener datos del tenant
    const { data: tenantData } = await adminClient
        .from('tenants')
        .select('legal_name, nit')
        .eq('id', rawLink.tenant_id)
        .maybeSingle()

    // Construir el objeto tipado para el componente cliente
    // Supabase puede retornar el join como array o como objeto — normalizamos
    type RawParty = { legal_name: string; doc_number: string }
    type RawDoc = {
        id: string
        number: string
        doc_type: string
        issue_date: string | null
        party: RawParty | RawParty[] | null
    }
    const docRaw = (rawLink.document as unknown) as RawDoc | null

    const party = docRaw?.party
        ? Array.isArray(docRaw.party)
            ? docRaw.party[0] ?? null
            : docRaw.party
        : null

    const linkData: PublicPaymentLinkData = {
        id: rawLink.id,
        token: rawLink.token,
        amount: Number(rawLink.amount),
        currency: rawLink.currency ?? 'COP',
        status: rawLink.status as PublicPaymentLinkData['status'],
        expires_at: rawLink.expires_at,
        document: {
            id: docRaw?.id ?? rawLink.document_id,
            number: docRaw?.number ?? 'N/A',
            doc_type: docRaw?.doc_type ?? 'INVOICE',
            issue_date: docRaw?.issue_date ?? null,
        },
        tenant: {
            legal_name: tenantData?.legal_name ?? 'GVM Corp',
            nit: tenantData?.nit ?? '',
        },
        party,
    }

    const expiresAt = new Date(rawLink.expires_at)
    const hoursLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 3600000))

    return (
        <main className="flex-1 flex flex-col items-center justify-start py-8 px-4">
            {/* Header */}
            <header className="w-full max-w-lg mb-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-sm">
                            G
                        </div>
                        <div>
                            <p className="font-black text-slate-900 text-sm leading-none">GVM Corp</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Portal de Pagos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full">
                        <Shield className="h-3 w-3 text-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Seguro</span>
                    </div>
                </div>
            </header>

            {/* Card principal */}
            <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
                {/* Banner de vencimiento */}
                {hoursLeft <= 24 && hoursLeft > 0 && (
                    <div className="bg-amber-50 border-b border-amber-100 px-6 py-3 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        <p className="text-xs font-black text-amber-700">
                            Este link vence en {hoursLeft} hora{hoursLeft !== 1 ? 's' : ''}
                        </p>
                    </div>
                )}

                <div className="p-8">
                    <PaymentForm linkData={linkData} />
                </div>
            </div>

            {/* Footer */}
            <footer className="mt-8 text-center space-y-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Powered by GVM Corp ERP
                </p>
                <p className="text-[10px] text-slate-300">
                    Colombia &bull; NIT {linkData.tenant.nit}
                </p>
            </footer>
        </main>
    )
}

// Componente auxiliar para estados de error
function ErrorScreen({ message }: { message: string }) {
    return (
        <main className="flex-1 flex flex-col items-center justify-center py-16 px-4">
            <div className="w-full max-w-sm text-center space-y-6">
                <div className="h-20 w-20 rounded-full bg-red-50 flex items-center justify-center border-4 border-red-100 mx-auto">
                    <AlertCircle className="h-10 w-10 text-red-400" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-xl font-black text-slate-900">Link No Valido</h1>
                    <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
                </div>
                <p className="text-xs text-slate-400">
                    Si crees que esto es un error, contacta al emisor de la factura.
                </p>
            </div>
        </main>
    )
}

// Componente auxiliar para estados informativos (pagado / expirado)
function StatusScreen({
    icon,
    title,
    message,
}: {
    icon: 'paid' | 'expired'
    title: string
    message: string
}) {
    const isPaid = icon === 'paid'
    return (
        <main className="flex-1 flex flex-col items-center justify-center py-16 px-4">
            <div className="w-full max-w-sm text-center space-y-6">
                <div className={`h-20 w-20 rounded-full flex items-center justify-center border-4 mx-auto ${
                    isPaid
                        ? 'bg-emerald-50 border-emerald-100'
                        : 'bg-slate-50 border-slate-100'
                }`}>
                    {isPaid
                        ? <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                        : <Clock className="h-10 w-10 text-slate-400" />
                    }
                </div>
                <div className="space-y-2">
                    <h1 className="text-xl font-black text-slate-900">{title}</h1>
                    <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
                </div>
            </div>
        </main>
    )
}
