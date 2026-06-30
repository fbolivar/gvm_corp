import { createClient } from '@/lib/supabase/server';
import { InventoryDashboard } from '@/features/inventory/components/InventoryDashboard';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/shared/components/ui/page-header';
import { Button } from '@/shared/components/ui/button';
import { Package, Plus, Warehouse as WarehouseIcon, FlaskConical, FileSpreadsheet, FileText } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
    searchParams: Promise<{ filter?: string }>
}

export default async function InventoryPage({ searchParams }: PageProps) {
    const supabase = await createClient();
    const { filter } = await searchParams;
    const isLowStockFilter = filter === 'low_stock';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

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
            : Promise.resolve({ data: null }),
    ]);

    const initialMovements = movementsData.data || [];
    const stock = stockData.data || [];
    const warehouses = warehousesData.data || [];

    const lowStockProductIds = new Set<string>();
    if (isLowStockFilter && lowStockRpcData.data) {
        (lowStockRpcData.data as Record<string, unknown>[]).forEach(p => {
            if (Number(p.total_qty) <= Number(p.min_stock || 5)) {
                lowStockProductIds.add(String(p.id));
            }
        });
    }

    const displayStock = isLowStockFilter
        ? stock?.filter(s => lowStockProductIds.has(s.product_id)) || []
        : stock || [];

    return (
        <div className="page-container">
            <PageHeader
                title="Inventario"
                description={isLowStockFilter ? 'Productos bajo nivel de seguridad' : 'Kardex, movimientos, stock por bodega y lotes.'}
                icon={Package}
                breadcrumbs={[
                    { label: 'Inicio', href: '/dashboard' },
                    { label: 'Inventario' },
                ]}
                actions={
                    <>
                        <Button asChild variant="outline">
                            <Link href="/inventory/lots">
                                <FlaskConical className="h-4 w-4 mr-1.5" />
                                Lotes
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/inventory/warehouses">
                                <WarehouseIcon className="h-4 w-4 mr-1.5" />
                                Bodegas
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/inventory/datasheets">
                                <FileText className="h-4 w-4 mr-1.5" />
                                Fichas técnicas
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                            <Link href="/inventory/import-stock">
                                <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                                Importar Stock
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href="/inventory/new">
                                <Plus className="h-4 w-4 mr-1.5" />
                                Nuevo movimiento
                            </Link>
                        </Button>
                    </>
                }
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
