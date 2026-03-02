import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Inbox, TrendingUp } from 'lucide-react'
import { getPaymentReportsAction } from '@/features/accounting/actions/paymentReportActions'
import { PaymentReportsClient } from '@/features/accounting/components/PaymentReportsClient'
import { settingsService } from '@/features/settings/services/settingsService'

export default async function CobrosPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [{ data: reports }, tenant] = await Promise.all([
        getPaymentReportsAction('ALL'),
        settingsService.getTenantInfo(supabase),
    ])

    const pendingCount = reports.filter(r => r.status === 'PENDING').length
    const approvedTotal = reports
        .filter(r => r.status === 'APPROVED')
        .reduce((s, r) => s + r.amount, 0)

    const fmt = (n: number) =>
        `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-700">

            {/* Header */}
            <div className="bg-slate-900 rounded-[4rem] p-12 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-all duration-1000">
                    <Inbox className="h-80 w-80 text-white" />
                </div>

                <div className="relative z-10 space-y-6">
                    <Link
                        href="/accounting/cartera"
                        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" /> Volver a Cartera
                    </Link>

                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8">
                        <div className="space-y-3">
                            <div className="flex items-center gap-4">
                                <div className="h-2 w-12 bg-indigo-500 rounded-full" />
                                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">
                                    Gestión de Recaudo
                                </span>
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black tracking-tighter italic uppercase leading-[0.85]">
                                Comprobantes <br />
                                <span className="text-slate-500">de Pago</span>
                            </h1>
                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">
                                Revisa y aprueba los reportes enviados por tus clientes
                            </p>
                        </div>

                        {/* Quick stats */}
                        <div className="flex items-center gap-6">
                            <div className="bg-white/5 backdrop-blur rounded-[2rem] p-6 min-w-[140px] text-center border border-white/10">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Pendientes
                                </p>
                                <p className="text-4xl font-black italic tracking-tighter text-amber-400">
                                    {pendingCount}
                                </p>
                            </div>
                            <div className="bg-white/5 backdrop-blur rounded-[2rem] p-6 min-w-[160px] text-center border border-white/10">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Total Recaudado
                                </p>
                                <p className="text-2xl font-black italic tracking-tighter text-emerald-400">
                                    {fmt(approvedTotal)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Interactive client */}
            <PaymentReportsClient initialReports={reports} />

            {/* Footer info */}
            <div className="flex items-center gap-6 p-10 bg-slate-50 rounded-[3rem] border border-slate-100">
                <TrendingUp className="h-8 w-8 text-indigo-400 shrink-0" />
                <div>
                    <p className="text-sm font-black italic tracking-tight text-slate-700 uppercase">
                        Flujo automático de recaudo
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                        Al aprobar un comprobante, la factura correspondiente se marca automáticamente como{' '}
                        <span className="text-emerald-600 font-black">PAGADA</span> y queda trazada en{' '}
                        <span className="font-black text-slate-600">{tenant?.name}</span>.
                    </p>
                </div>
            </div>
        </div>
    )
}
