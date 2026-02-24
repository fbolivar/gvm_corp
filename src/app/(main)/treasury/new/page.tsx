"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { treasuryService } from "@/features/treasury/services/treasuryService"
import { TreasuryTransactionForm } from "@/features/treasury/components/TreasuryTransactionForm"
import { TreasuryTransaction } from "@/features/treasury/types"
import { useToast } from "@/shared/hooks/use-toast"
import { Suspense } from "react"

function TransactionPageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const supabase = createClient()

    const type = (searchParams.get('type') as 'RECEIPT' | 'PAYMENT') || 'RECEIPT'

    const handleSubmit = async (data: TreasuryTransaction, options: { allocations?: any[], withholdings?: any[] }) => {
        setIsLoading(true)
        try {
            await treasuryService.createTransaction(supabase, data, options)

            toast({
                title: type === 'RECEIPT' ? "Recibo creado" : "Egreso creado",
                description: `El movimiento ha sido registrado y aplicado a los documentos seleccionados.`,
            })
            router.push('/treasury')
            router.refresh()
        } catch (error: any) {
            toast({
                title: "Error al registrar movimiento",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="container max-w-3xl mx-auto py-10">
            <TreasuryTransactionForm type={type} onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
    )
}

export default function NewTransactionPage() {
    return (
        <Suspense fallback={<div className="container mx-auto py-10 text-white">Cargando...</div>}>
            <TransactionPageContent />
        </Suspense>
    )
}
