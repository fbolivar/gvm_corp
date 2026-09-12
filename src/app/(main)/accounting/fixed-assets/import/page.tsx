import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/shared/components/ui/page-header'
import { Card, CardContent } from '@/shared/components/ui/card'
import { FixedAssetImporter } from '@/features/import/FixedAssetImporter'
import { Package, Info } from 'lucide-react'

export const metadata = { title: 'Importar Activos Fijos — GVM Corp' }

export default async function ImportAssetsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    return (
        <div className="page-container">
            <div className="space-y-6 pb-16 animate-in fade-in duration-500">
                <PageHeader
                    title="Importar Activos Fijos"
                    description="Carga masiva de activos fijos desde un Excel."
                    icon={Package}
                    breadcrumbs={[
                        { label: 'Inicio', href: '/dashboard' },
                        { label: 'Contabilidad', href: '/accounting' },
                        { label: 'Activos Fijos', href: '/accounting/fixed-assets' },
                        { label: 'Importar' },
                    ]}
                />
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex gap-3">
                    <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-indigo-900">¿Cómo funciona?</p>
                        <ol className="text-xs text-indigo-700 space-y-1 list-decimal list-inside">
                            <li>Prepara un Excel con: Código, Nombre, Categoría, Fecha compra, Costo, Vida útil (años), Valor residual y Depreciación acumulada.</li>
                            <li>La categoría se mapea automáticamente (Vehículo, Cómputo, Muebles, Maquinaria…).</li>
                            <li>Los códigos que ya existan se omiten (no duplica).</li>
                            <li>Luego puedes correr la depreciación mensual desde la lista de activos.</li>
                        </ol>
                    </div>
                </div>
                <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 px-5 py-3 flex items-center gap-3">
                        <Package className="h-4 w-4 text-slate-400" />
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Archivo de activos fijos</span>
                    </div>
                    <CardContent className="p-6"><FixedAssetImporter /></CardContent>
                </Card>
            </div>
        </div>
    )
}
