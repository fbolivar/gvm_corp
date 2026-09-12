"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { BankFileImporter } from "@/features/treasury/components/BankFileImporter"
import { createClient } from "@/lib/supabase/client"
import { VisualReportHeader } from "@/features/accounting/components/VisualReportHeader"
import { settingsService, TenantInfo } from "@/features/settings/services/settingsService"
import { Button } from "@/shared/components/ui/button"

export default function NewBankStatementPage() {
    const params = useParams()
    const supabase = createClient()
    const accountId = params.id as string
    const [tenant, setTenant] = useState<TenantInfo | null>(null)
    const [accountName, setAccountName] = useState<string>("")

    useEffect(() => {
        const load = async () => {
            const [t, acc] = await Promise.all([
                settingsService.getTenantInfo(supabase),
                supabase.from('treasury_accounts').select('name, bank_name').eq('id', accountId).maybeSingle(),
            ])
            setTenant(t)
            if (acc.data) setAccountName([acc.data.bank_name, acc.data.name].filter(Boolean).join(' · '))
        }
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accountId])

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl">
                    <Link href="/treasury/reconcile"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1">
                    <VisualReportHeader
                        title="Cargar extracto bancario"
                        subtitle="Sube el archivo del banco y crúzalo contra el libro auxiliar"
                        tenant={tenant}
                    />
                </div>
            </div>

            <BankFileImporter accountId={accountId} accountName={accountName} />
        </div>
    )
}
