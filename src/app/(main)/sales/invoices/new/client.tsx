"use client"

import { Document } from "@/features/documents/types"
import { Party } from "@/features/parties/types"
import { Product } from "@/features/products/types"
import { Warehouse } from "@/features/inventory/types"
import { DocumentForm } from "@/features/documents/components/DocumentForm"
import { createSalesDocumentAction } from "@/features/sales/actions"
import { useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Props {
    parties: Party[]
    products: Product[]
    warehouses?: Warehouse[]
}

export default function NewInvoiceClient({ parties, products, warehouses = [] }: Props) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (data: Document) => {
        setLoading(true)
        const result = await createSalesDocumentAction(
            { ...data, doc_type: 'INVOICE' },
            '/sales/invoices'
        )
        setLoading(false)

        if (result?.error) {
            toast.error(result.error)
            throw new Error(result.error)
        }

        toast.success('✅ Factura creada exitosamente', {
            description: 'La factura ha sido registrada correctamente en el sistema',
            duration: 4000,
        })
        router.push('/sales/invoices')
    }

    return (
        <DocumentForm
            parties={parties}
            products={products}
            warehouses={warehouses}
            onSubmit={handleSubmit}
            isLoading={loading}
            initialData={{
                doc_type: 'INVOICE',
                status: 'DRAFT',
                currency: 'COP',
                issue_date: new Date().toISOString().split('T')[0],
                lines: [],
                total: 0,
                subtotal: 0,
                taxes: 0
            } as any}
        />
    )
}
