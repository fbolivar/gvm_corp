import 'server-only'
import { unstable_cache, revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Product } from '@/features/products/types'
import type { Party } from '@/features/parties/types'

/**
 * Cache de listas pesadas usadas en formularios (productos y terceros).
 *
 * Por qué: cada cotización/pedido/factura recarga ~885 productos y ~6.575
 * terceros desde la BD. Cachearlos por empresa evita repetir esas consultas
 * en cada navegación.
 *
 * Seguridad: se usa el cliente admin (sin cookies, requerido por
 * unstable_cache) PERO se filtra SIEMPRE por tenant_id explícito, y la clave
 * de caché incluye el tenant_id → nunca se mezcla data entre empresas.
 *
 * Frescura: TTL de 5 min + tags para invalidar al crear/importar
 * (revalidateTag(`products:${tenantId}`) / `parties:${tenantId}`).
 */

export function getProductsLightCached(tenantId: string): Promise<Product[]> {
    return unstable_cache(
        async (): Promise<Product[]> => {
            const db = createAdminClient()
            const pageSize = 1000
            let offset = 0
            const all: Record<string, unknown>[] = []
            for (;;) {
                const { data, error } = await db
                    .from('products')
                    .select('id, sku, name, selling_price, cost, tax_category, status, type, uom, min_stock')
                    .eq('tenant_id', tenantId)
                    .eq('status', 'ACTIVE')
                    .order('name')
                    .range(offset, offset + pageSize - 1)
                if (error || !data || data.length === 0) break
                all.push(...data)
                if (data.length < pageSize) break
                offset += pageSize
            }
            return all.map(p => ({ ...p, stock_qty: 0, total_qty: 0 })) as unknown as Product[]
        },
        ['products-light', tenantId],
        { revalidate: 300, tags: ['products-light', `products:${tenantId}`] },
    )()
}

export function getPartiesLightCached(
    tenantId: string,
    role: 'customer' | 'vendor' | 'all' = 'all',
): Promise<Party[]> {
    return unstable_cache(
        async (): Promise<Party[]> => {
            const db = createAdminClient()
            const pageSize = 1000
            let offset = 0
            const all: Record<string, unknown>[] = []
            for (;;) {
                let q = db
                    .from('parties')
                    .select('id, legal_name, trade_name, doc_number, nit, email, phone, is_customer, is_vendor, party_type')
                    .eq('tenant_id', tenantId)
                if (role === 'customer') q = q.eq('is_customer', true)
                else if (role === 'vendor') q = q.eq('is_vendor', true)
                const { data, error } = await q.range(offset, offset + pageSize - 1)
                if (error || !data || data.length === 0) break
                all.push(...data)
                if (data.length < pageSize) break
                offset += pageSize
            }
            return all as unknown as Party[]
        },
        ['parties-light', tenantId, role],
        { revalidate: 300, tags: ['parties-light', `parties:${tenantId}`] },
    )()
}

/** Invalida la caché de listas (llamar tras crear/importar productos o terceros). */
export function revalidateProductsCache() {
    revalidateTag('products-light', 'max')
}
export function revalidatePartiesCache() {
    revalidateTag('parties-light', 'max')
}
