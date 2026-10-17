import type { SupabaseClient } from '@supabase/supabase-js';
import { buildCostOfSalesEntry, type CostAccountRule } from './costOfSalesEngine';
import { resolveLineIvaRate } from './salesAccountingEngine';

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
};
