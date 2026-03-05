import { createClient } from '@/lib/supabase/server';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import { InventoryHistoryTable } from '@/features/inventory/components/InventoryHistoryTable';
import { redirect } from 'next/navigation';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { settingsService } from '@/features/settings/services/settingsService';

export default async function InventoryHistoryPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [warehouses, tenant] = await Promise.all([
        inventoryService.getWarehouses(supabase),
        settingsService.getTenantInfo(supabase)
    ]);

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Historial de Movimientos"
                subtitle="Inventario — Registro de Operaciones"
                tenant={tenant}
            />

            <InventoryHistoryTable warehouses={warehouses} />
        </div>
    );
}
