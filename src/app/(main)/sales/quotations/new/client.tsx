"use client"

import dynamic from 'next/dynamic';
import { createSalesDocumentAction } from '@/features/sales/actions';
import { Document } from "@/features/documents/types";
import { Party } from "@/features/parties/types";
import { Product } from "@/features/products/types";
import { Warehouse } from "@/features/inventory/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function FormSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="bg-slate-900 rounded-2xl h-32" />
            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
                <div className="h-4 w-40 bg-slate-200 rounded" />
                <div className="h-10 bg-slate-100 rounded-xl" />
                <div className="h-10 bg-slate-100 rounded-xl" />
                <div className="h-10 bg-slate-100 rounded-xl w-1/2" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-20 bg-slate-50 rounded-xl" />
            </div>
            <div className="bg-slate-900 rounded-2xl h-40" />
        </div>
    );
}

const DocumentForm = dynamic(
    () => import('@/features/documents/components/DocumentForm').then(m => ({ default: m.DocumentForm })),
    { ssr: false, loading: () => <FormSkeleton /> }
);

interface Props {
    parties: Party[];
    products: Product[];
    warehouses?: Warehouse[];
    preSelectedProductId?: string;
}

export default function NewQuotationClient({ parties, products, warehouses = [], preSelectedProductId }: Props) {
    const router = useRouter();

    const handleSubmit = async (data: Document) => {
        const result = await createSalesDocumentAction(
            { ...data, doc_type: 'QUOTATION' },
            '/sales/quotations'
        );
        if (result?.error) {
            toast.error(result.error);
            throw new Error(result.error);
        }

        toast.success('✅ Cotización creada exitosamente', {
            description: 'La cotización ha sido registrada correctamente en el sistema',
            duration: 4000,
        });
        router.push('/sales/quotations');
    };

    const preProduct = preSelectedProductId
        ? products.find(p => p.id === preSelectedProductId)
        : undefined;

    const initialLines = preProduct
        ? [{
            product_id: preProduct.id,
            description: preProduct.name,
            qty: 1,
            unit_price: preProduct.selling_price || 0,
            line_total: preProduct.selling_price || 0,
        }]
        : [];

    return (
        <DocumentForm
            parties={parties}
            products={products}
            warehouses={warehouses}
            onSubmit={handleSubmit}
            initialData={{
                doc_type: 'QUOTATION',
                status: 'DRAFT',
                currency: 'COP',
                lines: initialLines,
                subtotal: 0,
                taxes: 0,
                total: 0,
            } as unknown as Document}
        />
    );
}
