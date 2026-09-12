'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export interface BarcodeRow {
    sku: string
    barcode: string
}

export interface BarcodeImportResult {
    updated: number
    not_found: string[]   // SKUs del Excel que no existen en el catálogo
    skipped: number       // filas con SKU o código vacío
    errors: string[]
}

function norm(s: string): string {
    return s.trim().toLowerCase()
}

/**
 * Carga masiva de códigos de barras: empareja cada fila por SKU (código interno)
 * y escribe el barcode en el producto. No crea productos ni toca otros campos.
 * Usa admin client filtrando por tenant para no depender de políticas RLS de UPDATE.
 */
export async function importProductBarcodesAction(rows: BarcodeRow[]): Promise<BarcodeImportResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: tenantId, error: tErr } = await supabase.rpc('get_my_tenant_id')
    if (tErr || !tenantId) {
        return { updated: 0, not_found: [], skipped: 0, errors: ['No se pudo determinar la empresa (tenant).'] }
    }

    const admin = createAdminClient()

    // Cargar SKUs del catálogo (paginado por si hay muchos)
    const bySku = new Map<string, string>()  // normSku → product_id
    const pageSize = 1000
    let offset = 0
    for (;;) {
        const { data, error } = await admin
            .from('products')
            .select('id, sku')
            .eq('tenant_id', tenantId)
            .range(offset, offset + pageSize - 1)
        if (error) {
            return { updated: 0, not_found: [], skipped: 0, errors: ['Error cargando productos: ' + error.message] }
        }
        if (!data || data.length === 0) break
        for (const p of data) {
            if (p.sku) bySku.set(norm(String(p.sku)), p.id as string)
        }
        if (data.length < pageSize) break
        offset += pageSize
    }

    const notFound: string[] = []
    const errors: string[] = []
    let skipped = 0

    // Deduplicar por producto (última fila gana)
    const toUpdate = new Map<string, string>()  // product_id → barcode
    for (const r of rows) {
        const sku = (r.sku ?? '').trim()
        const barcode = (r.barcode ?? '').trim()
        if (!sku || !barcode) { skipped++; continue }
        const id = bySku.get(norm(sku))
        if (!id) { notFound.push(sku); continue }
        toUpdate.set(id, barcode)
    }

    // Actualizar en lotes paralelos (más rápido que uno por uno)
    const entries = [...toUpdate.entries()]
    let updated = 0
    const chunkSize = 25
    for (let i = 0; i < entries.length; i += chunkSize) {
        const chunk = entries.slice(i, i + chunkSize)
        const results = await Promise.all(chunk.map(([id, barcode]) =>
            admin.from('products').update({ barcode }).eq('id', id).eq('tenant_id', tenantId)
        ))
        results.forEach((res, idx) => {
            if (res.error) errors.push(`Producto ${chunk[idx][0]}: ${res.error.message}`)
            else updated++
        })
    }

    revalidatePath('/products')
    return { updated, not_found: notFound, skipped, errors }
}
