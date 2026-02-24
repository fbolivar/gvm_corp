"use client"

import { useParams } from "next/navigation"
import { BankReconciliationMatcher } from "@/features/treasury/components/BankReconciliationMatcher"
import { Button } from "@/shared/components/ui/button"
import { ArrowLeft, Cpu } from "lucide-react"
import Link from "next/link"
import { VisualReportHeader } from "@/features/accounting/components/VisualReportHeader"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { settingsService, TenantInfo } from "@/features/settings/services/settingsService"

export default function MatchingPage() {
    const params = useParams()
    const supabase = createClient()
    const accountId = params.id as string
    const statementId = params.statementId as string
    const [tenant, setTenant] = useState<TenantInfo | null>(null)

    useEffect(() => {
        const loadTenant = async () => {
            const data = await settingsService.getTenantInfo(supabase)
            setTenant(data)
        }
        loadTenant()
    }, [])

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-8 md:p-12 space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <VisualReportHeader
                    title="Audit de Sincronización"
                    subtitle="Protocolo de vinculación de registros fiducitarios"
                    tenant={tenant}
                />
                <Button variant="outline" className="h-12 border-slate-200 bg-white text-slate-400 hover:text-slate-900 rounded-2xl shadow-sm px-6 font-black text-[10px] uppercase tracking-widest self-start md:self-center" asChild>
                    <Link href={`/treasury/reconcile`}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Abortar Análisis
                    </Link>
                </Button>
            </div>

            <div className="max-w-[1600px] mx-auto">
                <BankReconciliationMatcher statementId={statementId} />
            </div>
        </div>
    )
}
