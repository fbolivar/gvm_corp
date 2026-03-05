'use client'

import { useRouter } from 'next/navigation'
import { createProductAction } from '@/features/products/actions'
import { ProductForm } from '@/features/products/components/ProductForm'
import { Button } from '@/shared/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export default function NewProductPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (data: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        setIsLoading(true)
        const result = await createProductAction(data)
        setIsLoading(false)
        if (result?.error) toast.error(`Error: ${result.error}`)
    }

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => router.back()}
                    className="rounded-xl border-slate-200 h-9 w-9 shrink-0"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-lg font-bold text-slate-900">Crear Producto / Servicio</h1>
                    <p className="text-[10px] text-slate-400 font-medium">Nuevo item en el catalogo maestro</p>
                </div>
            </div>

            <ProductForm onSubmit={handleSubmit} isLoading={isLoading} />
        </div>
    )
}
