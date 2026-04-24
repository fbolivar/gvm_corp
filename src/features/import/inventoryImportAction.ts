'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export interface InventoryRow {
    warehouse_label: string // e.g. "FUSA", "Bogotá"
    sku: string             // e.g. "AGDES-654"
    name: string            // e.g. "AGUA DESTILADA * 500 ML"
    qty: number
}

export interface InventoryImportResult {
    adjusted: number        // movements inserted
    new_products: number
    zeroed_out: number      // products zeroed (not in Excel)
    warehouses_matched: string[]
    warehouses_not_found: string[]
    errors: string[]
}

function normalize(s: string): string {
    return s.toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .trim()
}

export async function importInventoryStockAction(rows: InventoryRow[]): Promise<InventoryImportResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const errors: string[] = []

    // 1. Load all warehouses for tenant
    const { data: warehouses } = await supabase.from('warehouses').select('id, name, code')
    if (!warehouses?.length) {
        return { adjusted: 0, new_products: 0, zeroed_out: 0, warehouses_matched: [], warehouses_not_found: [], errors: ['No se encontraron bodegas en el sistema'] }
    }

    // 2. Fuzzy match Excel labels → warehouse IDs
    const uniqueLabels = [...new Set(rows.map(r => r.warehouse_label))]
    const warehouseMap = new Map<string, string>()  // label → warehouse_id
    const warehousesMatched: string[] = []
    const warehousesNotFound: string[] = []

    for (const label of uniqueLabels) {
        const normLabel = normalize(label)
        const match = warehouses.find(w => {
            const normName = normalize(w.name)
            const normCode = normalize(w.code ?? '')
            return normName.includes(normLabel) || normCode.includes(normLabel)
        })
        if (match) {
            warehouseMap.set(label, match.id)
            warehousesMatched.push(`${label} → ${match.name}`)
        } else {
            warehousesNotFound.push(label)
            errors.push(`Bodega no encontrada: "${label}"`)
        }
    }

    if (warehouseMap.size === 0) {
        return { adjusted: 0, new_products: 0, zeroed_out: 0, warehouses_matched: [], warehouses_not_found: warehousesNotFound, errors }
    }

    const validRows = rows.filter(r => warehouseMap.has(r.warehouse_label))

    // 3. Load existing products → upsert missing ones
    const { data: existingProducts } = await supabase.from('products').select('id, sku')
    const productMap = new Map<string, string>()  // sku → id
    for (const p of existingProducts ?? []) {
        if (p.sku) productMap.set(p.sku, p.id)
    }

    const uniqueSkus = [...new Set(validRows.map(r => r.sku).filter(Boolean))]
    const newSkus = uniqueSkus.filter(sku => !productMap.has(sku))

    if (newSkus.length > 0) {
        const toInsert = newSkus.map(sku => {
            const row = validRows.find(r => r.sku === sku)!
            return { sku, name: row.name, type: 'GOOD' as const, status: 'active', uom: 'UNIT' }
        })
        for (let i = 0; i < toInsert.length; i += 200) {
            const { data: inserted } = await supabase
                .from('products')
                .upsert(toInsert.slice(i, i + 200), { onConflict: 'tenant_id,sku' })
                .select('id, sku')
            for (const p of inserted ?? []) {
                if (p.sku) productMap.set(p.sku, p.id)
            }
        }
    }

    // 4. Build target stock map from Excel: "productId:warehouseId" → target_qty
    const targetMap = new Map<string, number>()
    for (const row of validRows) {
        const productId = productMap.get(row.sku)
        const warehouseId = warehouseMap.get(row.warehouse_label)
        if (!productId || !warehouseId) continue
        const key = `${productId}:${warehouseId}`
        // If same product appears twice (shouldn't happen), take the last value
        targetMap.set(key, row.qty)
    }

    // 5. Query current stock from view for affected warehouses
    const affectedWarehouseIds = [...warehouseMap.values()]
    const { data: currentStock } = await supabase
        .from('product_stock')
        .select('product_id, warehouse_id, qty')
        .in('warehouse_id', affectedWarehouseIds)

    const currentMap = new Map<string, number>()  // "productId:warehouseId" → current_qty
    for (const row of currentStock ?? []) {
        currentMap.set(`${row.product_id}:${row.warehouse_id}`, Number(row.qty))
    }

    // 6. Compute deltas across UNION of current and target
    type Movement = {
        warehouse_id: string
        product_id: string
        type: 'IN' | 'OUT'
        qty: number
        cost: number
        ref_doc_type: string
    }

    const movements: Movement[] = []
    let zeroed_out = 0

    // All keys = union of current stock + target
    const allKeys = new Set([...currentMap.keys(), ...targetMap.keys()])

    for (const key of allKeys) {
        const [productId, warehouseId] = key.split(':')
        const current = currentMap.get(key) ?? 0
        const target = targetMap.get(key) ?? 0
        const delta = target - current

        if (Math.abs(delta) < 0.001) continue  // no change

        movements.push({
            warehouse_id: warehouseId,
            product_id: productId,
            type: delta > 0 ? 'IN' : 'OUT',
            qty: Math.abs(delta),
            cost: 0,
            ref_doc_type: 'STOCK_IMPORT',
        })

        if (target === 0 && current > 0) zeroed_out++
    }

    // 7. Bulk insert adjustment movements
    let adjusted = 0
    const BATCH = 500
    for (let i = 0; i < movements.length; i += BATCH) {
        const { error } = await supabase
            .from('inventory_movements')
            .insert(movements.slice(i, i + BATCH))
        if (error) {
            errors.push(`Error insertando movimientos: ${error.message}`)
        } else {
            adjusted += Math.min(BATCH, movements.length - i)
        }
    }

    return {
        adjusted,
        new_products: newSkus.length,
        zeroed_out,
        warehouses_matched: warehousesMatched,
        warehouses_not_found: warehousesNotFound,
        errors,
    }
}
