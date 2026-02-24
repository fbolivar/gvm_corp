"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { treasuryService } from "@/features/treasury/services/treasuryService"
import { TreasuryTransactionTable } from "@/features/treasury/components/TreasuryTransactionTable"
import { VisualReportHeader } from "@/features/accounting/components/VisualReportHeader"
import { settingsService, TenantInfo } from "@/features/settings/services/settingsService"
import { Button } from "@/shared/components/ui/button"
import { ArrowLeft, Landmark, Wallet, Activity, Zap, TrendingUp, TrendingDown, Clock } from "lucide-react"
import Link from "next/link"
import { Card } from "@/shared/components/ui/card"
import { cn } from "@/shared/lib/utils"

export default function AccountDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const supabase = createClient()
    const accountId = params.id as string

    const [account, setAccount] = useState<any>(null)
    const [transactions, setTransactions] = useState<any[]>([])
    const [tenant, setTenant] = useState<TenantInfo | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadData = async () => {
            try {
                const [accs, txs, tnt] = await Promise.all([
                    treasuryService.getAccounts(supabase),
                    treasuryService.getTransactions(supabase, { account_id: accountId }),
                    settingsService.getTenantInfo(supabase)
                ])

                const currentAccount = accs.find(a => a.id === accountId)
                if (!currentAccount) {
                    router.push('/treasury')
                    return
                }

                setAccount(currentAccount)
                setTransactions(txs)
                setTenant(tnt)
            } catch (error) {
                console.error("Error loading account details:", error)
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [accountId])

    if (isLoading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
    </div>

    const totalIn = transactions.filter(tx => tx.transaction_type === 'RECEIPT').reduce((sum, tx) => sum + tx.amount, 0)
    const totalOut = transactions.filter(tx => tx.transaction_type === 'PAYMENT').reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-8 md:p-12 space-y-12 animate-in fade-in duration-700">

            {/* 💎 HEADER CON TEXTO GHOST */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <VisualReportHeader
                    title={`AUDIT: ${account.name?.toUpperCase()}`}
                    subtitle="Protocolo de Auditoría de Nodo Financiero"
                    tenant={tenant}
                />
                <Button variant="outline" asChild className="h-12 border-slate-200 bg-white text-slate-400 hover:text-slate-900 rounded-2xl shadow-sm px-6 font-black text-[10px] uppercase tracking-widest self-start md:self-center">
                    <Link href="/treasury">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Volver al Centro
                    </Link>
                </Button>
            </div>

            {/* 📊 EJE DE MÉTRICAS DEL NODO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="rounded-[3rem] bg-slate-900 text-white p-10 shadow-active relative overflow-hidden group border-none">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <Wallet className="h-24 w-24" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Saldo Auditado</span>
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <h2 className="text-6xl font-black tracking-tighter italic leading-none">
                            ${account.balance?.toLocaleString('es-CO')}
                        </h2>
                        <div className="flex items-center gap-2 pt-2">
                            <Zap className="h-3.5 w-3.5 text-primary" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sincronización Bancaria Activa</span>
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-1 gap-4">
                    <Card className="rounded-[2.5rem] bg-white border border-slate-50 p-8 flex items-center gap-6 shadow-premium group hover:bg-emerald-50/50 transition-colors">
                        <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform">
                            <TrendingUp className="h-7 w-7" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inyecciones Totales</p>
                            <h4 className="text-2xl font-black text-slate-900 tracking-tighter italic">+${totalIn.toLocaleString('es-CO')}</h4>
                        </div>
                    </Card>
                    <Card className="rounded-[2.5rem] bg-white border border-slate-50 p-8 flex items-center gap-6 shadow-premium group hover:bg-rose-50/50 transition-colors">
                        <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-inner group-hover:-rotate-12 transition-transform">
                            <TrendingDown className="h-7 w-7" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Egresos Consolidados</p>
                            <h4 className="text-2xl font-black text-slate-900 tracking-tighter italic">-${totalOut.toLocaleString('es-CO')}</h4>
                        </div>
                    </Card>
                </div>

                <Card className="rounded-[3rem] bg-white border border-slate-50 p-10 flex flex-col justify-between shadow-premium relative overflow-hidden">
                    <div className="absolute -bottom-10 -right-10 opacity-[0.03]">
                        <Activity className="h-40 w-40 text-slate-900" />
                    </div>
                    <div className="space-y-6 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Landmark className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tighter italic uppercase leading-none">{account.bank_name || 'Efectivo'}</h3>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">N° {account.account_number || 'Caja Minorista'}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full border border-slate-200">Tipo: {account.type}</span>
                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">Verificado</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* 📑 TABLA DE ACTIVIDAD DEL NODO */}
            <div className="space-y-8">
                <div className="flex items-center gap-4 px-4">
                    <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-active">
                        <Clock className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">Bitácora de Movimientos</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Audit Trail de Activos & Pasivos</p>
                    </div>
                </div>

                <div className="max-w-[1600px] mx-auto">
                    <TreasuryTransactionTable transactions={transactions} tenant={tenant} />
                </div>
            </div>
        </div>
    )
}
