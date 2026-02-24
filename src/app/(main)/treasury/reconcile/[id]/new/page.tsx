"use client"

import { useParams, useRouter } from "next/navigation"
import { BankStatementImportForm } from "@/features/treasury/components/BankStatementImportForm"
import { treasuryService } from "@/features/treasury/services/treasuryService"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { useToast } from "@/shared/hooks/use-toast"
import { VisualReportHeader } from "@/features/accounting/components/VisualReportHeader"
import { settingsService, TenantInfo } from "@/features/settings/services/settingsService"

export default function NewBankStatementPage() {
    const params = useParams()
    const router = useRouter()
    const { toast } = useToast()
    const supabase = createClient()
    const [isLoading, setIsLoading] = useState(false)
    const [tenant, setTenant] = useState<TenantInfo | null>(null)
    const accountId = params.id as string

    useEffect(() => {
        const loadTenant = async () => {
            const data = await settingsService.getTenantInfo(supabase)
            setTenant(data)
        }
        loadTenant()
    }, [])

    const handleSubmit = async (statement: any, lines: any[]) => {
        setIsLoading(true)
        try {
            const newStmt = await treasuryService.createBankStatement(supabase, statement, lines)
            toast({
                title: "Protocolo de Carga Finalizado",
                description: "El extracto ha sido inyectado al sistema. Iniciando fase de conciliación...",
            })
            router.push(`/treasury/reconcile/${accountId}/match/${newStmt.id}`)
        } catch (error: any) {
            toast({
                title: "Falla de Protocolo",
                description: error.message,
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-8 md:p-12 space-y-12">
            <VisualReportHeader
                title="Carga de Extracto"
                subtitle="Protocolo de inyección de datos bancarios"
                tenant={tenant}
            />

            <div className="max-w-[1600px] mx-auto">
                <BankStatementImportForm
                    accountId={accountId}
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                />
            </div>
        </div>
    )
}
