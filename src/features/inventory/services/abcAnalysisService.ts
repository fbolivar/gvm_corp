import { SupabaseClient } from '@supabase/supabase-js';

export interface ABCProduct {
    product_id: string;
    product_name: string;
    sku: string;
    total_sales_value: number;
    total_sales_qty: number;
    current_stock: number;
    avg_cost: number;
    stock_value: number;
    rotation_index: number;
    days_of_stock: number;
    abc_class: 'A' | 'B' | 'C';
    cumulative_pct: number;
}

export interface ABCSummary {
    totalProducts: number;
    classA: { count: number; pctValue: number; pctItems: number };
    classB: { count: number; pctValue: number; pctItems: number };
    classC: { count: number; pctValue: number; pctItems: number };
    totalStockValue: number;
    avgRotation: number;
    slowMovers: number;
}

export interface ABCAnalysisResult {
    products: ABCProduct[];
    summary: ABCSummary;
}

const EMPTY_SUMMARY: ABCSummary = {
    totalProducts: 0,
    classA: { count: 0, pctValue: 0, pctItems: 0 },
    classB: { count: 0, pctValue: 0, pctItems: 0 },
    classC: { count: 0, pctValue: 0, pctItems: 0 },
    totalStockValue: 0,
    avgRotation: 0,
    slowMovers: 0,
};

export const abcAnalysisService = {
    async getAnalysis(
        client: SupabaseClient,
        days: number = 90
    ): Promise<ABCAnalysisResult> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startDateStr = startDate.toISOString();

        const [outMovementsRes, stockDataRes, productsRes] = await Promise.all([
            client
                .from('inventory_movements')
                .select('product_id, qty, cost')
                .eq('type', 'OUT')
                .gte('occurred_at', startDateStr),
            client
                .from('product_stock')
                .select('product_id, qty, avg_cost'),
            client
                .from('products')
                .select('id, name, sku, cost')
                .eq('status', 'active'),
        ]);

        const products = productsRes.data;
        if (!products || products.length === 0) {
            return { products: [], summary: EMPTY_SUMMARY };
        }

        // Aggregate sales by product
        const salesMap: Record<string, { value: number; qty: number }> = {};
        for (const m of outMovementsRes.data ?? []) {
            if (!salesMap[m.product_id]) {
                salesMap[m.product_id] = { value: 0, qty: 0 };
            }
            salesMap[m.product_id].value += Number(m.qty) * Number(m.cost);
            salesMap[m.product_id].qty += Number(m.qty);
        }

        // Aggregate stock by product (sum across warehouses)
        const stockMap: Record<string, { qty: number; avgCost: number }> = {};
        for (const s of stockDataRes.data ?? []) {
            if (!stockMap[s.product_id]) {
                stockMap[s.product_id] = { qty: 0, avgCost: Number(s.avg_cost) };
            }
            stockMap[s.product_id].qty += Number(s.qty);
            // Keep the latest avg_cost (last warehouse wins; good enough for ABC)
            stockMap[s.product_id].avgCost = Number(s.avg_cost);
        }

        // Build raw list sorted by sales value descending
        let abcProducts: ABCProduct[] = products.map(p => {
            const sales = salesMap[p.id] ?? { value: 0, qty: 0 };
            const stock = stockMap[p.id] ?? { qty: 0, avgCost: Number(p.cost) || 0 };
            const avgDailySales = sales.qty / Math.max(days, 1);
            const daysOfStock = avgDailySales > 0
                ? Math.round(stock.qty / avgDailySales)
                : 999;
            const rotationIndex = stock.qty > 0
                ? Math.round((sales.qty / stock.qty) * (365 / days) * 10) / 10
                : 0;

            return {
                product_id: p.id,
                product_name: p.name,
                sku: p.sku ?? '',
                total_sales_value: sales.value,
                total_sales_qty: sales.qty,
                current_stock: stock.qty,
                avg_cost: stock.avgCost,
                stock_value: stock.qty * stock.avgCost,
                rotation_index: rotationIndex,
                days_of_stock: daysOfStock,
                abc_class: 'C' as const,
                cumulative_pct: 0,
            };
        }).sort((a, b) => b.total_sales_value - a.total_sales_value);

        // Assign ABC classes using cumulative % of total sales value
        // A = 0–80%, B = 80–95%, C = 95–100%
        const totalSalesValue = abcProducts.reduce((s, p) => s + p.total_sales_value, 0);
        let cumulative = 0;
        abcProducts = abcProducts.map(p => {
            cumulative += p.total_sales_value;
            const pct = totalSalesValue > 0
                ? Math.round((cumulative / totalSalesValue) * 1000) / 10
                : 100;
            const abc_class: 'A' | 'B' | 'C' =
                pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C';
            return { ...p, cumulative_pct: pct, abc_class };
        });

        // Build summary
        const classA = abcProducts.filter(p => p.abc_class === 'A');
        const classB = abcProducts.filter(p => p.abc_class === 'B');
        const classC = abcProducts.filter(p => p.abc_class === 'C');
        const totalStockValue = abcProducts.reduce((s, p) => s + p.stock_value, 0);
        const slowMovers = abcProducts.filter(p => p.total_sales_qty === 0).length;
        const n = abcProducts.length;

        const pctValue = (items: ABCProduct[]) =>
            totalSalesValue > 0
                ? Math.round(items.reduce((s, p) => s + p.total_sales_value, 0) / totalSalesValue * 100)
                : 0;

        const summary: ABCSummary = {
            totalProducts: n,
            classA: { count: classA.length, pctValue: pctValue(classA), pctItems: n > 0 ? Math.round(classA.length / n * 100) : 0 },
            classB: { count: classB.length, pctValue: pctValue(classB), pctItems: n > 0 ? Math.round(classB.length / n * 100) : 0 },
            classC: { count: classC.length, pctValue: pctValue(classC), pctItems: n > 0 ? Math.round(classC.length / n * 100) : 0 },
            totalStockValue,
            avgRotation: n > 0
                ? Math.round(abcProducts.reduce((s, p) => s + p.rotation_index, 0) / n * 10) / 10
                : 0,
            slowMovers,
        };

        return { products: abcProducts, summary };
    },
};
