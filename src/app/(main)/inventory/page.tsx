import { createClient } from '@/lib/supabase/server';
import { InventoryList } from '@/features/inventory/components/InventoryList';
import { StockOverview } from '@/features/inventory/components/StockOverview';
import { InventoryCharts } from '@/features/inventory/components/InventoryCharts';
import { InventoryDashboard } from '@/features/inventory/components/InventoryDashboard';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import { Button } from '@/shared/components/ui/button';
import {
    Plus,
    Building2,
    History,
    RotateCcw,
    TrendingUp,
    PackageSearch,
    AlertCircle,
    ShoppingCart,
    ArrowRightLeft,
    Table as TableIcon,
    ChevronRight,
    Box
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";

interface PageProps {
    searchParams: Promise<{ filter?: string }>
}

export default async function InventoryPage({ searchParams }: PageProps) {
    const supabase = await createClient();
    const { filter } = await searchParams;
    const isLowStockFilter = filter === 'low_stock';

    // Fetch data in parallel
    const [movementsData, stockData, warehousesData, movementsCount, trends, lowStockRpcData] = await Promise.all([
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
            : Promise.resolve({ data: null })
    ]);

    const initialMovements = movementsData.data || [];
    const stock = stockData.data || [];
    const warehouses = warehousesData.data || [];

    // Build set of low stock product IDs when filter is active
    const lowStockProductIds = new Set<string>();
    if (isLowStockFilter && lowStockRpcData.data) {
        (lowStockRpcData.data as any[]).forEach(p => {
            if (Number(p.total_qty) <= Number(p.min_stock || 5)) {
                lowStockProductIds.add(p.id);
            }
        });
    }

    // Filter stock to low stock items if filter is active
    const displayStock = isLowStockFilter
        ? stock?.filter(s => lowStockProductIds.has(s.product_id)) || []
        : stock || [];

    return (
        <div className="page-container">
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
