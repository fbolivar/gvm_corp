'use client'

import { InventoryMovementForm } from '@/features/inventory/components/InventoryMovementForm';
import { createMovementAction } from '@/features/inventory/actions';
import { InventoryMovement } from "@/features/inventory/types";
import { Product } from "@/features/products/types";
import { Warehouse } from "@/features/inventory/types";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Props {
    products: Product[];
    warehouses: Warehouse[];
}

export default function NewMovementClient({ products, warehouses }: Props) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (data: InventoryMovement) => {
        setIsLoading(true);
        try {
            const result = await createMovementAction(data);
            if (result?.error) {
                toast.error(`Error: ${result.error}`);
            } else {
                toast.success('Movimiento registrado exitosamente');
                router.push('/inventory');
                router.refresh();
            }
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("Error al registrar movimiento");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <InventoryMovementForm
            products={products}
            warehouses={warehouses}
            onSubmit={handleSubmit}
            isLoading={isLoading}
        />
    );
}
