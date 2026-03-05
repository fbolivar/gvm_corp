import { createClient } from '@/lib/supabase/server';
import { InventoryDashboard } from '@/features/inventory/components/InventoryDashboard';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import { redirect } from 'next/navigation';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { settingsService } from '@/features/settings/services/settingsService';

interface PageProps {
    searchParams: Promise<{ filter?: string }>
}

export default async function InventoryPage({ searchParams }: PageProps) {
    const supabase = await createClient();
    const { filter } = await searchParams;
    const isLowStockFilter = filter === 'low_stock';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [movementsData, stockData, warehousesData, movementsCount, trends, lowStockRpcData, tenant] = await Promise.all([
        supabase
            .from('inventory_movements')
            .select('*, products(name, sku), warehouses(name)')
            .order('occurred_at', { ascending: false })
            .limit(10),
        supabase
            .from('product_stock')
            .select('*, products(name, sku, min_stock), warehouses(name)'),
        supabase
            .from('warehouses')
            .select('*')
            .order('name'),
        inventoryService.getMovementsStats(supabase),
        inventoryService.getInventoryTrends(supabase),
        isLowStockFilter
            ? supabase.rpc('get_products_with_stock', { p_limit: 1000, p_offset: 0, p_search: '' })
            : Promise.resolve({ data: null }),
        settingsService.getTenantInfo(supabase)
    ]);

    const initialMovements = movementsData.data || [];
    const stock = stockData.data || [];
    const warehouses = warehousesData.data || [];

    // Build set of low stock product IDs when filter is active
    const lowStockProductIds = new Set<string>();
    if (isLowStockFilter && lowStockRpcData.data) {
        (lowStockRpcData.data as Record<string, unknown>[]).forEach(p => {
            if (Number(p.total_qty) <= Number(p.min_stock || 5)) {
                lowStockProductIds.add(String(p.id));
            }
        });
    }

    // Filter stock to low stock items if filter is active
    const displayStock = isLowStockFilter
        ? stock?.filter(s => lowStockProductIds.has(s.product_id)) || []
        : stock || [];

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Inventario"
                subtitle="Kardex — Movimientos y Stock"
                tenant={tenant}
            />

            <InventoryDashboard
                initialMovements={initialMovements}
                initialStock={displayStock}
                movementsCount={movementsCount}
                trends={trends}
                warehouses={warehouses}
            />
        </div>
    );
}
