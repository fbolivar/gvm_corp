import type { SupabaseClient } from '@supabase/supabase-js'

// Solo documentos de venta con precio (no compras ni remisiones sin valor).
const SALES_TYPES = new Set(['INVOICE', 'SALES_ORDER', 'QUOTATION', 'RECEIPT'])

interface DocLike {
    doc_type?: string
    lines?: Array<{ product_id?: string | null; unit_price?: number | string | null }>
}

/**
 * Verifica que ninguna línea de venta quede por debajo del margen mínimo
 * (costo × (1 + utilidad%)) cuando el producto tiene `enforce_margin` activo.
 * Devuelve un mensaje de error listando las violaciones, o null si todo está bien.
 */
export async function checkMarginViolations(supabase: SupabaseClient, data: DocLike): Promise<string | null> {
    if (!data.doc_type || !SALES_TYPES.has(data.doc_type)) return null
    const lines = (data.lines ?? []).filter((l) => l.product_id)
    if (lines.length === 0) return null

    const ids = [...new Set(lines.map((l) => l.product_id as string))]
    const { data: prods } = await supabase
        .from('products')
        .select('id, sku, name, cost, min_margin, enforce_margin')
        .in('id', ids)
    const byId = new Map((prods ?? []).map((p) => [p.id as string, p]))

    const viol: string[] = []
    for (const l of lines) {
        const p = byId.get(l.product_id as string)
        if (!p || !p.enforce_margin) continue
        const cost = Number(p.cost) || 0
        const margin = Number(p.min_margin) || 0
        if (cost <= 0 || margin <= 0) continue
        const minPrice = cost * (1 + margin / 100)
        const price = Number(l.unit_price) || 0
        if (price < minPrice - 0.5) {
            viol.push(`${p.sku ? p.sku + ' ' : ''}${p.name}: mínimo $${Math.ceil(minPrice).toLocaleString('es-CO')} (utilidad ${margin}%), ingresado $${price.toLocaleString('es-CO')}`)
        }
    }
    if (viol.length === 0) return null
    return 'No se puede facturar por debajo del margen mínimo:\n' + viol.join('\n')
}
