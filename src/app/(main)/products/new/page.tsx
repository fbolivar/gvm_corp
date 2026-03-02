'use client'

import { useRouter } from 'next/navigation'
import { createProductAction } from '@/features/products/actions'
import { ProductForm } from '@/features/products/components/ProductForm'
import { Button } from '@/shared/components/ui/button'
import { ArrowLeft, Package, Zap } from 'lucide-react'
import { useState } from 'react'

export default function NewProductPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (data: any) => {
        setIsLoading(true)
        const result = await createProductAction(data)
        setIsLoading(false)
        if (result?.error) alert(`Error: ${result.error}`)
    }

    return (
        <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Header */}
            <div className="flex items-center gap-4 px-1">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => router.back()}
                    className="rounded-xl border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-400 shrink-0"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="px-2.5 py-1 bg-slate-900 rounded-full flex items-center gap-2 shadow-active">
                            <Zap className="h-2 w-2 text-blue-400 fill-blue-400" />
                            <span className="text-[8px] font-bold text-white uppercase tracking-widest">Nuevo Ítem</span>
                        </div>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight italic uppercase leading-none flex items-center gap-3">
                        <Package className="h-6 w-6 text-blue-400" />
                        Crear Producto / Servicio
                    </h1>
                </div>
            </div>

            <div className="px-1">
                <ProductForm onSubmit={handleSubmit} isLoading={isLoading} />
            </div>
        </div>
    )
}
