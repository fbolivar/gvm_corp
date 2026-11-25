import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAllRows } from '@/shared/lib/fetchAllRows';
import { buildCostOfSalesEntry, type CostAccountRule } from './costOfSalesEngine';
import { resolveLineIvaRate } from './salesAccountingEngine';
import { accountingService } from './accountingService';

/**
 * Mapa de cuentas de costo de venta por tarifa (del PUC real de GVM, espejo del
 * inventario de compras). PENDIENTE de confirmación del contador; si cambia, se
 * ajusta aquí (o se mueve a una tabla si llega a necesitar variar por producto).
 */
export const COST_OF_SALES_ACCOUNTS: CostAccountRule[] = [
    { iva_rate: 0, cost_account: '61352201', inventory_account: '143501' },
    { iva_rate: 5, cost_account: '61352202', inventory_account: '143503' },
    { iva_rate: 19, cost_account: '61352203', inventory_account: '143505' },
];

export interface CostOfSalesDraft {
    document_id: string;
    totals: ReturnType<typeof buildCostOfSalesEntry>['totals'];
    lines: Array<{ account_code: string; concept: string; iva_rate: number; debit: number; credit: number }>;
    warnings: string[];
}

/**
 * Calcula el asiento de costo de venta de un documento (pedido facturado o
 * factura). El costo unitario sale de `products.cost` (último costo). NO escribe
 * nada: alimenta la simulación para que el contador valide antes de encender.
 */
export const costOfSalesService = {
    previewCostOfSalesEntry(document: Record<string, unknown>): CostOfSalesDraft {
        const docLines = Array.isArray(document.lines) ? document.lines : [];
        const lines = docLines.map((l: Record<string, unknown>) => {
            const product = l.product as { cost?: number; tax_category?: string } | undefined;
            return {
                qty: Number(l.qty) || 0,
                unit_cost: Number(product?.cost) || 0,
                iva_rate: resolveLineIvaRate(l.tax_config, product?.tax_category),
            };
        });

        const result = buildCostOfSalesEntry(lines, COST_OF_SALES_ACCOUNTS);
        return {
            document_id: String(document.id),
            totals: result.totals,
            lines: result.lines.map(l => ({
                account_code: l.account_code, concept: l.concept, iva_rate: l.iva_rate,
                debit: l.debit, credit: l.credit,
            })),
            warnings: result.warnings,
        };
    },

    /** Resuelve códigos de cuenta a ids del PUC (para cuando se encienda el posteo). */
    async resolveAccountIds(client: SupabaseClient): Promise<Map<string, string>> {
        const codes = [...new Set(COST_OF_SALES_ACCOUNTS.flatMap(r => [r.cost_account, r.inventory_account]))];
        const { data } = await client.from('chart_accounts').select('id, code').in('code', codes);
        return new Map((data ?? []).map((a: { id: string; code: string }) => [a.code, a.id]));
    },

    /**
     * Contabiliza el COSTO DE VENTA de un MES como UN asiento consolidado (decisión
     * del contador: mensual como WorldOffice, no por documento). Agrega el costo de
     * TODAS las líneas vendidas del mes (pedidos facturados = la operación real) por
     * tarifa de IVA: débito costo (6135xx) / crédito inventario (143xxx).
     *
     * - GATED por `tenants.auto_post_cogs` (apagado por defecto).
     * - Idempotente por `source_key = COGS:YYYY-MM` (clave estable + índice único):
     *   reejecutar el mismo mes no duplica.
     * - Reversible con `unpostMonthlyCogs` (para recalcular si llega más costo).
     *
     * Costo unitario: `products.cost`. Las unidades de productos sin costo cargado
     * NO se contabilizan (se avisan), para no inventar un costo.
     */
    async postMonthlyCogs(
        client: SupabaseClient,
        params: { tenantId: string; period: string },
    ): Promise<{ entry: unknown | null; skipped?: boolean; reason?: string; warnings: string[]; totals?: ReturnType<typeof buildCostOfSalesEntry>['totals'] }> {
        const { tenantId, period } = params;
        if (!/^\d{4}-\d{2}$/.test(period)) throw new Error('Periodo inválido (usa YYYY-MM).');

        const { data: t } = await client.from('tenants').select('auto_post_cogs').eq('id', tenantId).maybeSingle();
        if (!t?.auto_post_cogs) return { entry: null, skipped: true, reason: 'El costo de venta automático está apagado (auto_post_cogs).', warnings: [] };

        const sourceKey = `COGS:${period}`;
        const { data: existing } = await client
            .from('journal_entries').select('id')
            .eq('tenant_id', tenantId).eq('source_key', sourceKey).limit(1).maybeSingle();
        if (existing) return { entry: null, skipped: true, reason: `El costo de venta de ${period} ya está contabilizado.`, warnings: [] };

        const [y, m] = period.split('-').map(Number);
        const startDate = `${period}-01`;
        const endDate = `${period}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;

        type Row = { qty: number | null; tax_config: unknown; product: { cost?: number; tax_category?: string } | Array<{ cost?: number; tax_category?: string }> | null };
        const rows = await fetchAllRows<Row>(({ from, to }) => client
            .from('document_lines')
            .select('qty, tax_config, product:products(cost, tax_category), doc:documents!inner(issue_date, doc_type, status, tenant_id)')
            .eq('doc.tenant_id', tenantId)
            .eq('doc.doc_type', 'SALES_ORDER')
            .eq('doc.status', 'ACCEPTED')
            .gte('doc.issue_date', startDate)
            .lte('doc.issue_date', endDate)
            .order('id')
            .range(from, to),
            { label: 'cogs.monthly' });

        const costLines = rows.map(r => {
            const p = Array.isArray(r.product) ? r.product[0] : r.product;
            return { qty: Number(r.qty) || 0, unit_cost: Number(p?.cost) || 0, iva_rate: resolveLineIvaRate(r.tax_config, p?.tax_category) };
        });

        const result = buildCostOfSalesEntry(costLines, COST_OF_SALES_ACCOUNTS);
        if (result.totals.costo <= 0) {
            return { entry: null, skipped: true, reason: 'No hay costo de venta en el periodo (¿faltan costos de producto?).', warnings: result.warnings, totals: result.totals };
        }

        const idByCode = await this.resolveAccountIds(client);
        const missing = [...new Set(result.lines.map(l => l.account_code).filter(code => !idByCode.get(code)))];
        if (missing.length) throw new Error(`Cuentas de costo/inventario no encontradas en el PUC: ${missing.join(', ')}.`);

        const entry = await accountingService.createEntry(client, {
            tenant_id: tenantId,
            entry_date: endDate,
            description: `Costo de ventas ${period} (consolidado mensual)`,
            source_key: sourceKey,
            lines: result.lines.map(l => ({
                account_id: idByCode.get(l.account_code)!,
                debit: l.debit,
                credit: l.credit,
                description: `Costo de ventas ${l.iva_rate}%`,
            })),
        });

        return { entry, warnings: result.warnings, totals: result.totals };
    },

    /** Revierte el asiento de COGS de un mes (para recalcular si llega más costo). */
    async unpostMonthlyCogs(client: SupabaseClient, tenantId: string, period: string): Promise<{ removed: number }> {
        const sourceKey = `COGS:${period}`;
        const { data: entries } = await client
            .from('journal_entries').select('id')
            .eq('tenant_id', tenantId).eq('source_key', sourceKey);
        if (!entries || entries.length === 0) return { removed: 0 };
        const ids = entries.map((e: { id: string }) => e.id);
        await client.from('journal_lines').delete().in('entry_id', ids);
        await client.from('journal_entries').delete().in('id', ids);
        return { removed: ids.length };
    },
};
