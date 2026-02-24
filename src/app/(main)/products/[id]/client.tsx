'use client'

import React from 'react';
import { ProductForm } from '@/features/products/components/ProductForm';
import { updateProductAction } from '@/features/products/actions';
import { Product } from "@/features/products/types";
import { ProductKardex } from '@/features/inventory/components/ProductKardex';
import {
    Settings2,
    ClipboardList,
    Box,
    History,
    FileText,
    ArrowLeft
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useRouter } from 'next/navigation';

export default function EditProductClient({ product, movements }: { product: Product; movements?: any[] }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = React.useState<'details' | 'kardex'>('details');

    const handleSubmit = async (data: Product) => {
        const id = product.id!;
        const result = await updateProductAction(id, data);
        if (result?.error) {
            alert(`Error: ${result.error}`);
        }
    };

    const tabs = [
        { id: 'details', label: 'Especificaciones', icon: FileText },
        { id: 'kardex', label: 'Kardex / Historial', icon: History },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.back()}
                        className="rounded-xl border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-400"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                            {product.name}
                            <span className="text-sm font-mono text-slate-500 bg-slate-900/50 px-2 py-0.5 rounded border border-slate-800 uppercase tracking-widest">
                                {product.sku || 'SIN SKU'}
                            </span>
                        </h1>
                        <p className="text-slate-400 text-sm font-medium mt-1">
                            Gestión técnica y movimientos de inventario
                        </p>
                    </div>
                </div>
            </div>

            {/* Premium Glass Tabs */}
            <div className="relative">
                <div className="flex p-1 gap-1 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/60 w-fit">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`
                                    relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300
                                    ${isActive
                                        ? 'text-white shadow-lg'
                                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}
                                `}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/40 animate-in zoom-in-95 duration-200" />
                                )}
                                <span className="relative z-10 flex items-center gap-2">
                                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Dynamic Content with Backdrop Decor */}
            <div className="relative mt-8 min-h-[500px]">
                {/* Decorative background blur */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10">
                    {activeTab === 'details' && (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                            <ProductForm initialData={product} onSubmit={handleSubmit} />
                        </div>
                    )}

                    {activeTab === 'kardex' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <ProductKardex movements={movements || []} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
