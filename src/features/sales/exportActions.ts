'use server'

import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/shared/lib/fetchAllRows'
import { documentService } from '@/features/documents/services/documentService'
import { purchaseOrderService } from '@/features/purchasing/services/purchaseOrderService'

export interface OrderExportRow {
    number: string | null
    issue_date: string | null
    status: string
    /** Facturas (FEV) asociadas al pedido, separadas por coma. Vacío si no aplica. */
    invoice_numbers: string
    party_name: string
    party_doc: string
    warehouse: string
    subtotal: number
    taxes: number
    total: number
}

/** Una línea de producto de un documento. Alimenta la hoja "Detalle productos". */
export interface OrderExportLine {
    number: string | null
    issue_date: string | null
    status: string
    /** Facturas (FEV) del pedido al que pertenece la línea. */
    invoice_numbers: string
    party_name: string
    party_doc: string
    warehouse: string
    sku: string
    product: string
    uom: string
    qty: number
    unit_price: number
    tax_rate: number
    /** qty × precio (sin IVA) */
    base: number
    tax_amount: number
    /** base + IVA */
    total: number
}

export interface OrderExportData {
    rows: OrderExportRow[]
    lines: OrderExportLine[]
}

export interface OrderExportFilters {
    search?: string
    status?: string
    /** Excluye anulados, para que el Excel coincida con lo que muestra la lista. */
    hide_voided?: boolean
    warehouse_id?: string
    start_date?: string
    end_date?: string
}

const TAX_CATEGORY_RATE: Record<string, number> = { IVA_0: 0, IVA_5: 5, IVA_19: 19 }

/**
 * Tarifa de IVA de una línea: manda lo guardado en `tax_config`; si no hay,
 * se toma la categoría del producto. Misma regla que el formulario y el PDF.
 */
function lineTaxRate(taxConfig: unknown, taxCategory?: string | null): number {
    if (Array.isArray(taxConfig) && taxConfig.length > 0) {
        const r = Number((taxConfig[0] as { rate?: unknown })?.rate)
        if (Number.isFinite(r)) return r
    }
    return TAX_CATEGORY_RATE[taxCategory ?? 'IVA_0'] ?? 0
}

/** PostgREST devuelve las relaciones embebidas como objeto o como array de 1. */
function embedded<T>(rel: unknown): T | null {
    if (Array.isArray(rel)) return (rel[0] as T) ?? null
    return (rel as T) ?? null
}

/** Documentos (pedidos SALES_ORDER / cotizaciones QUOTATION) que cumplen los filtros. Tope 5000. */
export async function exportDocumentsAction(docType: string, filters: OrderExportFilters): Promise<OrderExportData> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { rows: [], lines: [] }

    const { data } = await documentService.getDocuments(supabase, {
        page: 1,
        per_page: 5000,
        type: docType as never,
        search: filters.search,
        status: filters.status as never,
        hide_voided: filters.hide_voided,
        warehouse_id: filters.warehouse_id,
        start_date: filters.start_date,
        end_date: filters.end_date,
    })

    const docs = (data ?? []) as Array<Record<string, any>>

    const rows: OrderExportRow[] = docs.map((d) => ({
        number: d.number ?? null,
        issue_date: d.issue_date ?? null,
        status: d.status ?? '',
        invoice_numbers: (d.invoice_numbers ?? []).join(', '),
        party_name: d.party?.legal_name ?? '',
        party_doc: d.party?.doc_number ?? '',
        warehouse: d.warehouse?.name ?? '',
        subtotal: Number(d.subtotal) || 0,
        taxes: Number(d.taxes) || 0,
        total: Number(d.total) || 0,
    }))

    // Detalle por producto. Se consulta aparte (getDocuments no trae líneas) y en
    // bloques de ids para no pasarse del largo máximo de la URL de PostgREST.
    const ids = docs.map((d) => d.id as string).filter(Boolean)
    const lineRows: Array<Record<string, any>> = []
    const CHUNK = 100
    for (let i = 0; i < ids.length; i += CHUNK) {
        const { data: chunk } = await supabase
            .from('document_lines')
            .select('document_id, description, qty, unit_price, tax_config, product:products(sku, name, uom, tax_category), warehouse:warehouses(name)')
            .in('document_id', ids.slice(i, i + CHUNK))
        if (chunk) lineRows.push(...(chunk as Array<Record<string, any>>))
    }

    const byDoc = new Map<string, Array<Record<string, any>>>()
    for (const l of lineRows) {
        const key = l.document_id as string
        const list = byDoc.get(key)
        if (list) list.push(l); else byDoc.set(key, [l])
    }

    // Se recorre en el orden de los documentos para que el detalle salga
    // agrupado por pedido igual que la hoja resumen.
    const lines: OrderExportLine[] = []
    for (const d of docs) {
        const head = {
            number: d.number ?? null,
            issue_date: d.issue_date ?? null,
            status: d.status ?? '',
            invoice_numbers: (d.invoice_numbers ?? []).join(', '),
            party_name: d.party?.legal_name ?? '',
            party_doc: d.party?.doc_number ?? '',
        }
        for (const l of byDoc.get(d.id as string) ?? []) {
            const product = embedded<{ sku?: string | null; name?: string | null; uom?: string | null; tax_category?: string | null }>(l.product)
            const wh = embedded<{ name?: string | null }>(l.warehouse)
            const qty = Number(l.qty) || 0
            const unitPrice = Number(l.unit_price) || 0
            const base = qty * unitPrice
            const rate = lineTaxRate(l.tax_config, product?.tax_category)
            const taxAmount = base * (rate / 100)
            lines.push({
                ...head,
                warehouse: wh?.name ?? d.warehouse?.name ?? '',
                sku: product?.sku ?? '',
                product: product?.name ?? l.description ?? '',
                uom: product?.uom ?? '',
                qty,
                unit_price: unitPrice,
                tax_rate: rate,
                base,
                tax_amount: taxAmount,
                total: base + taxAmount,
            })
        }
    }

    return { rows, lines }
}

const TRANSFER_STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Borrador',
    IN_TRANSIT: 'En tránsito',
    RECEIVED: 'Recibido',
    CANCELLED: 'Anulado',
}

/**
 * Traslados entre bodegas (tablas warehouse_transfers / warehouse_transfer_lines).
 * No hay tercero ni IVA: se valoriza al COSTO del producto, igual que el PDF del
 * traslado. Las columnas de "cliente/NIT" se reutilizan como Origen/Destino.
 */
export async function exportTransfersAction(filters: OrderExportFilters): Promise<OrderExportData> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { rows: [], lines: [] }

    let query = supabase
        .from('warehouse_transfers')
        .select(`
            id, transfer_number, status, notes, created_at, transferred_at, received_at,
            from_warehouse:warehouses!from_warehouse_id(name),
            to_warehouse:warehouses!to_warehouse_id(name),
            lines:warehouse_transfer_lines(
                description, qty, qty_received, notes,
                product:products(sku, name, uom, cost)
            )
        `)
        .order('created_at', { ascending: false })
        // 'id' desempata para que el paginado de abajo no salte filas.
        .order('id')

    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
    if (filters.search) query = query.ilike('transfer_number', `%${filters.search}%`)
    // created_at es timestamp: el filtro "hasta" debe cubrir todo el día.
    if (filters.start_date) query = query.gte('created_at', filters.start_date)
    if (filters.end_date) query = query.lte('created_at', `${filters.end_date}T23:59:59`)

    // El Excel debe traer TODOS los traslados del filtro: sin paginar, PostgREST
    // devolvería como mucho 1.000 y el archivo saldría incompleto sin avisar.
    const transfers = await fetchAllRows<Record<string, any>>(
        ({ from, to }) => query.range(from, to),
        { label: 'export:traslados' },
    )

    const rows: OrderExportRow[] = []
    const lines: OrderExportLine[] = []

    for (const t of transfers) {
        const from = embedded<{ name?: string | null }>(t.from_warehouse)?.name ?? ''
        const to = embedded<{ name?: string | null }>(t.to_warehouse)?.name ?? ''
        const status = TRANSFER_STATUS_LABELS[t.status as string] ?? (t.status ?? '')
        const date = (t.transferred_at ?? t.created_at ?? null) as string | null
        let subtotal = 0

        for (const l of (t.lines ?? []) as Array<Record<string, any>>) {
            const product = embedded<{ sku?: string | null; name?: string | null; uom?: string | null; cost?: number | null }>(l.product)
            const qty = Number(l.qty) || 0
            const unitPrice = Number(product?.cost) || 0
            const base = qty * unitPrice
            subtotal += base
            const recibido = Number(l.qty_received) || 0
            const obs = [l.notes, recibido !== qty ? `Recibido: ${recibido}` : null].filter(Boolean).join(' · ')
            lines.push({
                number: t.transfer_number ?? null,
                issue_date: date,
                status,
                invoice_numbers: '',
                party_name: from,
                party_doc: to,
                warehouse: obs,
                sku: product?.sku ?? '',
                product: product?.name ?? l.description ?? '',
                uom: product?.uom ?? '',
                qty,
                unit_price: unitPrice,
                tax_rate: 0,
                base,
                tax_amount: 0,
                total: base,
            })
        }

        rows.push({
            number: t.transfer_number ?? null,
            issue_date: date,
            status,
            invoice_numbers: '',
            party_name: from,
            party_doc: to,
            warehouse: (t.notes as string) ?? '',
            subtotal,
            taxes: 0,
            total: subtotal,
        })
    }

    return { rows, lines }
}

/** Órdenes de compra (tabla propia purchase_orders). */
export async function exportPurchaseOrdersAction(): Promise<OrderExportData> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { rows: [], lines: [] }

    const orders = (await purchaseOrderService.getOrders(supabase)) as Array<Record<string, any>>
    const rows: OrderExportRow[] = orders.map((o) => ({
        number: o.po_number ?? null,
        issue_date: o.order_date ?? null,
        status: o.status ?? '',
        invoice_numbers: '',
        party_name: o.supplier?.legal_name ?? '',
        party_doc: o.supplier?.doc_number ?? '',
        warehouse: '',
        subtotal: Number(o.subtotal) || 0,
        taxes: Number(o.tax_total) || 0,
        total: Number(o.total) || 0,
    }))

    const ids = orders.map((o) => o.id as string).filter(Boolean)
    const lineRows: Array<Record<string, any>> = []
    const CHUNK = 100
    for (let i = 0; i < ids.length; i += CHUNK) {
        const { data: chunk } = await supabase
            .from('purchase_order_lines')
            .select('order_id, qty, unit_cost, tax_rate, notes, product:products(sku, name, uom)')
            .in('order_id', ids.slice(i, i + CHUNK))
        if (chunk) lineRows.push(...(chunk as Array<Record<string, any>>))
    }

    const byOrder = new Map<string, Array<Record<string, any>>>()
    for (const l of lineRows) {
        const key = l.order_id as string
        const list = byOrder.get(key)
        if (list) list.push(l); else byOrder.set(key, [l])
    }

    const lines: OrderExportLine[] = []
    for (const o of orders) {
        for (const l of byOrder.get(o.id as string) ?? []) {
            const product = embedded<{ sku?: string | null; name?: string | null; uom?: string | null }>(l.product)
            const qty = Number(l.qty) || 0
            const unitPrice = Number(l.unit_cost) || 0
            const base = qty * unitPrice
            const rate = Number(l.tax_rate) || 0
            const taxAmount = base * (rate / 100)
            lines.push({
                number: o.po_number ?? null,
                issue_date: o.order_date ?? null,
                status: o.status ?? '',
                invoice_numbers: '',
                party_name: o.supplier?.legal_name ?? '',
                party_doc: o.supplier?.doc_number ?? '',
                warehouse: '',
                sku: product?.sku ?? '',
                product: product?.name ?? l.notes ?? '',
                uom: product?.uom ?? '',
                qty,
                unit_price: unitPrice,
                tax_rate: rate,
                base,
                tax_amount: taxAmount,
                total: base + taxAmount,
            })
        }
    }

    return { rows, lines }
}
