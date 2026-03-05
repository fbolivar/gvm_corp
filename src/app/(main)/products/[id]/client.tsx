'use client'

import React from 'react';
import { ProductForm } from '@/features/products/components/ProductForm';
import { updateProductAction } from '@/features/products/actions';
import { Product } from "@/features/products/types";
import { ProductKardex } from '@/features/inventory/components/ProductKardex';
import { FileText, History, ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useRouter } from 'next/navigation';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';

export default function EditProductClient({ product, movements }: { product: Product; movements?: any[] }) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const router = useRouter();
    const [activeTab, setActiveTab] = React.useState<'details' | 'kardex'>('details');

    const handleSubmit = async (data: Product) => {
        const id = product.id!;
        const result = await updateProductAction(id, data);
        if (result?.error) {
            toast.error(`Error: ${result.error}`);
        }
    };

    const tabs = [
        { id: 'details', label: 'Especificaciones', icon: FileText },
        { id: 'kardex', label: 'Kardex / Historial', icon: History },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => router.back()}
                    className="rounded-xl border-slate-200 h-9 w-9 shrink-0"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-bold text-slate-900 truncate">{product.name}</h1>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 shrink-0">
                            {product.sku || 'SIN SKU'}
                        </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">Gestion tecnica y movimientos de inventario</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg w-fit">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'details' | 'kardex')}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                                isActive
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div>
                {activeTab === 'details' && (
                    <ProductForm initialData={product} onSubmit={handleSubmit} />
                )}
                {activeTab === 'kardex' && (
                    <ProductKardex movements={movements || []} />
                )}
            </div>
        </div>
    );
}
