import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/shared/components/ui/page-header'
import { Card, CardContent } from '@/shared/components/ui/card'
import { InventoryStockImporter } from '@/features/import/InventoryStockImporter'
import { FileSpreadsheet, Info } from 'lucide-react'

export const metadata = { title: 'Importar Inventario — GVM Corp' }

export default async function ImportStockPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    return (
        <div className="page-container">
            <div className="space-y-6 pb-16 animate-in fade-in duration-500">
                <PageHeader
                    title="Importar Inventario Diario"
                    description="Carga el archivo Excel exportado para actualizar las existencias de todas las bodegas."
                    icon={FileSpreadsheet}
                    breadcrumbs={[
                        { label: 'Inicio', href: '/dashboard' },
                        { label: 'Inventario', href: '/inventory' },
                        { label: 'Importar Stock' },
                    ]}
                />

                {/* Instructions */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex gap-3">
                    <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-indigo-900">¿Cómo funciona?</p>
                        <ol className="text-xs text-indigo-700 space-y-1 list-decimal list-inside">
                            <li>Exporta el reporte de existencias desde el sistema de inventario (.xlsx)</li>
                            <li>Arrastra o selecciona el archivo en el área de abajo</li>
                            <li>Revisa el resumen de bodegas y productos detectados</li>
                            <li>Haz clic en <strong>Actualizar Inventario</strong> — el sistema calculará los ajustes automáticamente</li>
                        </ol>
                        <p className="text-[10px] text-indigo-500 mt-2">
                            El proceso inserta movimientos de ajuste (IN/OUT) para llevar cada producto a la existencia exacta del archivo.
                            Se puede importar varias veces al día sin problema.
                        </p>
                    </div>
                </div>

                {/* Importer */}
                <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 px-5 py-3 flex items-center gap-3">
                        <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Archivo de existencias
                        </span>
                    </div>
                    <CardContent className="p-6">
                        <InventoryStockImporter />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
