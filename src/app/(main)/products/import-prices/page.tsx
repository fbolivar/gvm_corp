import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/shared/components/ui/page-header'
import { Card, CardContent } from '@/shared/components/ui/card'
import { PriceListImporter } from '@/features/import/PriceListImporter'
import { getPriceListsAction } from '@/features/import/priceImportAction'
import { DollarSign, Info } from 'lucide-react'

export const metadata = { title: 'Cargar Precios — GVM Corp' }

export default async function ImportPricesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const priceLists = await getPriceListsAction()

    return (
        <div className="page-container">
            <div className="space-y-6 pb-16 animate-in fade-in duration-500">
                <PageHeader
                    title="Cargar Listas de Precios"
                    description="Actualiza los precios de forma masiva desde un Excel (SKU + precio)."
                    icon={DollarSign}
                    breadcrumbs={[
                        { label: 'Inicio', href: '/dashboard' },
                        { label: 'Inventario', href: '/inventory' },
                        { label: 'Productos', href: '/products' },
                        { label: 'Precios' },
                    ]}
                />

                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex gap-3">
                    <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-indigo-900">¿Cómo funciona?</p>
                        <ol className="text-xs text-indigo-700 space-y-1 list-decimal list-inside">
                            <li>Elige la <strong>lista</strong> a actualizar (Distribución, Lista A, Lista B, Porcicultor).</li>
                            <li>Sube un Excel con dos columnas: <strong>SKU</strong> y <strong>Precio</strong> (hay plantilla).</li>
                            <li>Se empareja por SKU y se actualiza el precio. Los SKU que no existan se reportan.</li>
                            <li>Si eliges la lista <strong>por defecto</strong>, también se actualiza el precio de venta que usan los documentos.</li>
                        </ol>
                    </div>
                </div>

                {priceLists.length === 0 ? (
                    <Card className="rounded-2xl border border-slate-100"><CardContent className="p-8 text-center text-sm text-slate-500">No hay listas de precios configuradas.</CardContent></Card>
                ) : (
                    <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="border-b border-slate-100 px-5 py-3 flex items-center gap-3">
                            <DollarSign className="h-4 w-4 text-slate-400" />
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Archivo de precios</span>
                        </div>
                        <CardContent className="p-6">
                            <PriceListImporter priceLists={priceLists} />
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
