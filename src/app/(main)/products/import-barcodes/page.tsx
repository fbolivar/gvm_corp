import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/shared/components/ui/page-header'
import { Card, CardContent } from '@/shared/components/ui/card'
import { ProductBarcodeImporter } from '@/features/import/ProductBarcodeImporter'
import { ScanBarcode, Info } from 'lucide-react'

export const metadata = { title: 'Cargar Códigos de Barras — GVM Corp' }

export default async function ImportBarcodesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    return (
        <div className="page-container">
            <div className="space-y-6 pb-16 animate-in fade-in duration-500">
                <PageHeader
                    title="Cargar Códigos de Barras"
                    description="Asigna códigos de barras a tus productos de forma masiva desde un Excel."
                    icon={ScanBarcode}
                    breadcrumbs={[
                        { label: 'Inicio', href: '/dashboard' },
                        { label: 'Inventario', href: '/inventory' },
                        { label: 'Productos', href: '/products' },
                        { label: 'Códigos de barras' },
                    ]}
                />

                {/* Instructions */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex gap-3">
                    <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-indigo-900">¿Cómo funciona?</p>
                        <ol className="text-xs text-indigo-700 space-y-1 list-decimal list-inside">
                            <li>Prepara un Excel con dos columnas: <strong>SKU</strong> y <strong>Código de barras</strong> (puedes descargar la plantilla).</li>
                            <li>Arrastra o selecciona el archivo abajo y revisa la vista previa.</li>
                            <li>Haz clic en <strong>Cargar códigos de barras</strong> — se empareja por SKU y se guarda el código en cada producto.</li>
                            <li>Luego podrás <strong>buscar y escanear productos por su código de barras</strong> en toda la aplicación.</li>
                        </ol>
                        <p className="text-[10px] text-indigo-500 mt-2">
                            No se crean productos nuevos: los SKU que no existan se listan al final para que los revises.
                        </p>
                    </div>
                </div>

                {/* Importer */}
                <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 px-5 py-3 flex items-center gap-3">
                        <ScanBarcode className="h-4 w-4 text-slate-400" />
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Archivo de códigos de barras
                        </span>
                    </div>
                    <CardContent className="p-6">
                        <ProductBarcodeImporter />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
