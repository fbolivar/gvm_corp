"use client"

import { DocumentForm, type CommercialOption } from '@/features/documents/components/DocumentForm';
import { createSalesDocumentAction } from '@/features/sales/actions';
import { Document } from "@/features/documents/types";
import { Party } from "@/features/parties/types";
import { Product } from "@/features/products/types";
import { Warehouse } from "@/features/inventory/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
    parties: Party[];
    products: Product[];
    warehouses?: Warehouse[];
    tenantId?: string;
    commercials?: CommercialOption[];
}

export default function NewOrderClient({ parties, products, warehouses = [], tenantId, commercials = [] }: Props) {
    const router = useRouter();

    const handleSubmit = async (data: Document) => {
        const result = await createSalesDocumentAction(
            { ...data, doc_type: 'SALES_ORDER' },
            '/sales/orders'
        );
        if (result?.error) {
            toast.error(result.error);
            throw new Error(result.error);
        }

        // Success! Show toast and redirect
        toast.success('✅ Pedido creado exitosamente', {
            description: 'El pedido ha sido registrado correctamente en el sistema',
            duration: 4000,
        });
        router.push('/sales/orders');
    };

    return (
        <DocumentForm
            parties={parties}
            products={products}
            warehouses={warehouses}
            onSubmit={handleSubmit}
            initialData={{ doc_type: 'SALES_ORDER' } as any}
            tenantId={tenantId}
            commercials={commercials}
        />
    );
}
