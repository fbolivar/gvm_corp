"use client"

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { updateSalesDocumentAction } from '@/features/sales/actions';
import { Document } from "@/features/documents/types";
import { Party } from "@/features/parties/types";
import { Product } from "@/features/products/types";
import { Warehouse } from "@/features/inventory/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const DocumentForm = dynamic(
    () => import('@/features/documents/components/DocumentForm').then(m => ({ default: m.DocumentForm })),
    { ssr: false }
);

interface Props {
    documentId: string;
    parties: Party[];
    products: Product[];
    warehouses?: Warehouse[];
    tenantId?: string;
    initialData: Document;
}

export default function EditDocumentClient({ documentId, parties, products, warehouses = [], tenantId, initialData }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (data: Document) => {
        setLoading(true);
        let result;
        try {
            result = await updateSalesDocumentAction(documentId, data, `/documents/${documentId}`);
        } finally {
            setLoading(false);
        }
        if (result?.error) {
            toast.error(result.error);
            throw new Error(result.error);
        }

        toast.success('✅ Documento actualizado', {
            description: 'Los cambios se guardaron correctamente.',
            duration: 4000,
        });
        router.push(`/documents/${documentId}`);
    };

    return (
        <DocumentForm
            parties={parties}
            products={products}
            warehouses={warehouses}
            onSubmit={handleSubmit}
            isLoading={loading}
            initialData={initialData}
            tenantId={tenantId}
        />
    );
}
