'use client'

import { DocumentForm } from '@/features/documents/components/DocumentForm';
import { createDocumentAction } from '@/features/documents/actions';
import { Document } from "@/features/documents/types";
import { Product } from "@/features/products/types";
import { Party } from "@/features/parties/types";

interface Props {
    products: Product[];
    parties: Party[];
}

export default function NewDocumentClient({ products, parties }: Props) {

    const handleSubmit = async (data: Document) => {
        const result = await createDocumentAction(data);
        if (result?.error) {
            alert(`Error: ${result.error}`);
        }
    };

    return <DocumentForm products={products} parties={parties} onSubmit={handleSubmit} />;
}
