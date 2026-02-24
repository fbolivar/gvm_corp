"use client"

import { Account } from "@/features/accounting/types"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { treasuryService } from "@/features/treasury/services/treasuryService"
import { TreasuryAccountForm } from "@/features/treasury/components/TreasuryAccountForm"
import { TreasuryAccount } from "@/features/treasury/types"
import { toast } from "sonner"
import { ArrowLeft, Landmark, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { Button } from "@/shared/components/ui/button"

import { VisualReportHeader } from "@/features/accounting/components/VisualReportHeader"
import { settingsService, TenantInfo } from "@/features/settings/services/settingsService"

export default function NewAccountPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [chartAccounts, setChartAccounts] = useState<Account[]>([])
    const [tenant, setTenant] = useState<TenantInfo | null>(null)
    const supabase = createClient()

    useEffect(() => {
        const fetchData = async () => {
            const [chartRes, tenantRes] = await Promise.all([
                supabase
                    .from('chart_accounts')
                    .select('*')
                    .eq('is_auxiliary', true)
                    .order('code', { ascending: true }),
                settingsService.getTenantInfo(supabase)
            ])

            if (chartRes.data) setChartAccounts(chartRes.data as Account[])
            setTenant(tenantRes)
        }
        fetchData()
    }, [supabase])

    const handleSubmit = async (data: TreasuryAccount) => {
        setIsLoading(true)
        try {
            // Create the account
            const newAccount = await treasuryService.createAccount(supabase, data)

            // If there's an initial balance, create an adjustment transaction
            if (data.balance > 0) {
                await treasuryService.createTransaction(supabase, {
                    account_id: newAccount.id,
                    amount: data.balance,
                    transaction_type: 'RECEIPT',
                    date: new Date().toISOString().split('T')[0],
                    description: 'Saldo Inicial (Ajuste)',
                    reference_number: 'INI-001'
                })
            }

            toast.success("Cuenta Vinculada", {
                description: `La cuenta ${data.name} ha sido registrada correctamente.`
            })
            router.push('/treasury')
            router.refresh()
        } catch (error: any) {
            toast.error("Error al vincular cuenta", {
                description: error.message
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-8 md:p-12 space-y-12 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <VisualReportHeader
                    title="Vincular Nodo Financiero"
                    subtitle="Protocolo de Expansión de Liquidez"
                    tenant={tenant}
                />
                <Button variant="outline" asChild className="h-12 border-slate-200 bg-white text-slate-400 hover:text-slate-900 rounded-2xl shadow-sm px-6 font-black text-[10px] uppercase tracking-widest self-start md:self-center">
                    <Link href="/treasury">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Abortar
                    </Link>
                </Button>
            </div>

            <main className="max-w-4xl mx-auto space-y-12">
                <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-active flex items-center gap-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <Landmark className="h-20 w-20" />
                    </div>
                    <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner rotate-3">
                        <ShieldCheck className="h-8 w-8 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black italic uppercase italic tracking-tighter">Acceso Auditado</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                            Toda vinculación de recursos financieros es rastreada por el sistema de seguridad integral.
                        </p>
                    </div>
                </div>

                <TreasuryAccountForm
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    chartAccounts={chartAccounts}
                />
            </main>
        </div>
    )
}
