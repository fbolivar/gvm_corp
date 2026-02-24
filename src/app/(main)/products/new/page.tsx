'use client'

import { createProductAction } from '@/features/products/actions';
import { ProductForm } from '@/features/products/components/ProductForm';

export default function NewProductPage() {

    const handleSubmit = async (data: any) => {
        const result = await createProductAction(data);
        if (result?.error) {
            alert(`Error: ${result.error}`);
        }
    };

    return (
        <div className="container mx-auto py-6 max-w-2xl">
            <h1 className="text-2xl font-bold mb-4">Nuevo Producto</h1>
            <ProductForm onSubmit={handleSubmit} />
        </div>
    );
}
