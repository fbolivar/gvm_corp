'use server'

import { createClient } from '@/lib/supabase/server'
import { settingsService } from '@/features/settings/services/settingsService'
import { canViewModule } from '@/shared/lib/moduleGuard'
import { fetchAllRows } from '@/shared/lib/fetchAllRows'

export interface ProductLabel {
    id: string
    sku: string
    name: string
    uom: string | null
    code: string
}

export interface LabelData {
    prefix: string
    labels: ProductLabel[]
    missingCount: number
}

/** Prefijo del código = NIT de GVM, solo dígitos (sin DV ni puntos). Fallback: "GVM". */
function nitPrefix(nit: string | null | undefined): string {
    const digits = (nit ?? '').toString().replace(/\D/g, '')
    return digits || 'GVM'
}

/** Productos activos de GVM que ya tienen un código generado por nosotros (empiezan con el prefijo). */
async function loadLabels(
    supabase: Awaited<ReturnType<typeof createClient>>,
    prefix: string,
): Promise<ProductLabel[]> {
    const rows = await fetchAllRows<{ id: string; sku: string; name: string; uom: string | null; barcode: string }>(
        ({ from, to }) =>
            supabase
                .from('products')
                .select('id, sku, name, uom, barcode')
                .eq('status', 'ACTIVE')
                .like('barcode', `${prefix} %`)
                .order('sku', { ascending: true })
                .order('id', { ascending: true })
                .range(from, to),
        { label: 'loadProductLabels' },
    )
    return rows.map((r) => ({
        id: r.id,
        sku: r.sku,
        name: r.name,
        uom: r.uom,
        code: r.barcode,
    }))
}

/** Cuántos productos activos NO tienen ningún código de barras/QR (null o vacío). */
async function countMissing(
    supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<number> {
    // total activos − activos con código real (evita el frágil `barcode.eq.` vacío en un OR).
    const [{ count: total }, { count: withCode }] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
        supabase.from('products').select('id', { count: 'exact', head: true })
            .eq('status', 'ACTIVE').not('barcode', 'is', null).neq('barcode', ''),
    ])
    return Math.max(0, (total ?? 0) - (withCode ?? 0))
}

/** Carga inicial de la pantalla de etiquetas (solo lectura). */
export async function getProductLabelData(): Promise<LabelData | { error: string }> {
    if (!(await canViewModule('inventory'))) return { error: 'Sin permiso para ver inventario' }

    const supabase = await createClient()
    const tenant = await settingsService.getTenantInfo(supabase)
    if (!tenant) return { error: 'Empresa no encontrada' }

    const prefix = nitPrefix(tenant.nit)
    const [labels, missingCount] = await Promise.all([
        loadLabels(supabase, prefix),
        countMissing(supabase),
    ])
    return { prefix, labels, missingCount }
}

/**
 * Asigna un código estable a los productos activos SIN código (vía RPC, por tenant)
 * y devuelve la lista completa de etiquetas imprimibles ya actualizada.
 */
export async function generateMissingProductLabelsAction(): Promise<LabelData & { assigned: number } | { error: string }> {
    if (!(await canViewModule('inventory'))) return { error: 'Sin permiso para gestionar inventario' }

    const supabase = await createClient()
    const tenant = await settingsService.getTenantInfo(supabase)
    if (!tenant) return { error: 'Empresa no encontrada' }

    const prefix = nitPrefix(tenant.nit)

    const { data, error } = await supabase.rpc('assign_missing_product_barcodes', { p_prefix: prefix })
    if (error) return { error: error.message }

    const [labels, missingCount] = await Promise.all([
        loadLabels(supabase, prefix),
        countMissing(supabase),
    ])
    return { prefix, labels, missingCount, assigned: Number(data ?? 0) }
}
