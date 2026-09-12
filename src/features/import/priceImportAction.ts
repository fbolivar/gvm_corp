'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { revalidateProductsCache } from '@/shared/lib/cachedLookups'

export interface PriceRow {
    sku: string
    price: number
}

export interface PriceImportResult {
    listName: string
    isDefault: boolean
    updated: number       // ítems de la lista actualizados
    inserted: number      // ítems nuevos en la lista
    selling_updated: number // productos cuyo precio de venta se actualizó (si es lista por defecto)
    not_found: string[]
    skipped: number
    errors: string[]
}

export async function getPriceListsAction() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('price_lists')
        .select('id, name, is_default')
        .order('is_default', { ascending: false })
        .order('name')
    return data ?? []
}

/**
 * Carga masiva de precios a una lista: empareja por SKU y actualiza/inserta el
 * precio. Si la lista es la POR DEFECTO, también actualiza el precio de venta del
 * producto (que es el que hoy usan los documentos). No crea productos.
 */
export async function importPriceListAction(priceListId: string, rows: PriceRow[]): Promise<PriceImportResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const empty: PriceImportResult = { listName: '', isDefault: false, updated: 0, inserted: 0, selling_updated: 0, not_found: [], skipped: 0, errors: [] }

    const { data: tenantId } = await supabase.rpc('get_my_tenant_id')
    if (!tenantId) return { ...empty, errors: ['No se pudo determinar la empresa.'] }

    const admin = createAdminClient()
    const { data: list } = await admin
        .from('price_lists')
        .select('id, name, is_default')
        .eq('id', priceListId)
        .eq('tenant_id', tenantId)
        .maybeSingle()
    if (!list) return { ...empty, errors: ['Lista de precios no encontrada.'] }

    // SKU -> product_id
    const bySku = new Map<string, string>()
    let offset = 0
    for (;;) {
        const { data, error } = await admin.from('products').select('id, sku').eq('tenant_id', tenantId).range(offset, offset + 999)
        if (error) return { ...empty, listName: list.name, isDefault: list.is_default, errors: ['Error cargando productos: ' + error.message] }
        if (!data || !data.length) break
        for (const p of data) if (p.sku) bySku.set(String(p.sku).trim().toLowerCase(), p.id as string)
        if (data.length < 1000) break
        offset += 1000
    }

    // ítems existentes de la lista: product_id -> item id
    const existing = new Map<string, string>()
    offset = 0
    for (;;) {
        const { data } = await admin.from('price_list_items').select('id, product_id').eq('price_list_id', priceListId).range(offset, offset + 999)
        if (!data || !data.length) break
        for (const it of data) existing.set(it.product_id as string, it.id as string)
        if (data.length < 1000) break
        offset += 1000
    }

    const not_found: string[] = []
    const errors: string[] = []
    let skipped = 0
    const toUpdate: { id: string; price: number }[] = []
    const toInsert: { tenant_id: string; price_list_id: string; product_id: string; unit_price: number }[] = []
    const sellingUpdates: { id: string; price: number }[] = []
    const seen = new Set<string>()

    for (const r of rows) {
        const sku = (r.sku ?? '').trim()
        const price = Number(r.price)
        if (!sku || !isFinite(price) || price < 0) { skipped++; continue }
        const pid = bySku.get(sku.toLowerCase())
        if (!pid) { not_found.push(sku); continue }
        if (seen.has(pid)) continue
        seen.add(pid)
        const itemId = existing.get(pid)
        if (itemId) toUpdate.push({ id: itemId, price })
        else toInsert.push({ tenant_id: tenantId as string, price_list_id: priceListId, product_id: pid, unit_price: price })
        if (list.is_default) sellingUpdates.push({ id: pid, price })
    }

    let updated = 0, inserted = 0, selling_updated = 0

    for (let i = 0; i < toUpdate.length; i += 25) {
        const chunk = toUpdate.slice(i, i + 25)
        const res = await Promise.all(chunk.map((u) => admin.from('price_list_items').update({ unit_price: u.price }).eq('id', u.id)))
        res.forEach((x) => (x.error ? errors.push(x.error.message) : updated++))
    }
    for (let i = 0; i < toInsert.length; i += 200) {
        const chunk = toInsert.slice(i, i + 200)
        const { error } = await admin.from('price_list_items').insert(chunk)
        if (error) errors.push(error.message); else inserted += chunk.length
    }
    // Lista por defecto → también el precio de venta del producto (el que usan los documentos)
    if (list.is_default) {
        for (let i = 0; i < sellingUpdates.length; i += 25) {
            const chunk = sellingUpdates.slice(i, i + 25)
            const res = await Promise.all(chunk.map((u) => admin.from('products').update({ selling_price: u.price }).eq('id', u.id)))
            res.forEach((x) => (x.error ? errors.push(x.error.message) : selling_updated++))
        }
    }

    revalidateProductsCache()
    revalidatePath('/products')
    return { listName: list.name, isDefault: list.is_default, updated, inserted, selling_updated, not_found, skipped, errors }
}
