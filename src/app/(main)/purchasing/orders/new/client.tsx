"use client"

import { Document } from "@/features/documents/types"
import { Party } from "@/features/parties/types"
import { Product } from "@/features/products/types"
import { DocumentForm } from "@/features/documents/components/DocumentForm"
import { createPurchasingDocumentAction } from "@/features/purchasing/actions"
import { useState } from "react"

interface Props {
    parties: Party[]
    products: Product[]
}

export default function NewOrderClient({ parties, products }: Props) {
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (data: Document) => {
        setLoading(true)
        const result = await createPurchasingDocumentAction(
            { ...data, doc_type: 'PURCHASE_ORDER' },
            '/purchasing/orders'
        )
        setLoading(false)
        if (result?.error) alert(result.error)
    }

    return (
        <DocumentForm
            parties={parties}
            products={products}
            onSubmit={handleSubmit}
            isLoading={loading}
            initialData={{ doc_type: 'PURCHASE_ORDER', status: 'DRAFT', currency: 'COP', issue_date: new Date().toISOString().split('T')[0], lines: [], total: 0, subtotal: 0, taxes: 0 } as any}
        />
    )
}
