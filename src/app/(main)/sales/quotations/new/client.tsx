"use client"

import { DocumentForm } from '@/features/documents/components/DocumentForm';
import { createSalesDocumentAction } from '@/features/sales/actions';
import { Document } from "@/features/documents/types";
import { Party } from "@/features/parties/types";
import { Product } from "@/features/products/types";

interface Props {
    parties: Party[];
    products: Product[];
}

export default function NewQuotationClient({ parties, products }: Props) {
    const handleSubmit = async (data: Document) => {
        const result = await createSalesDocumentAction(
            { ...data, doc_type: 'QUOTATION' },
            '/sales/quotations'
        );
        if (result?.error) {
            alert(`Error: ${result.error}`);
        }
    };

    return (
        <DocumentForm
            parties={parties}
            products={products}
            onSubmit={handleSubmit}
            initialData={{ doc_type: 'QUOTATION' } as any}
        />
    );
}
