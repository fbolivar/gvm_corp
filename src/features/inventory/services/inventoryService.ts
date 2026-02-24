import { SupabaseClient } from '@supabase/supabase-js';
import { InventoryMovement, Warehouse } from '../types';

import { accountingService } from '../../accounting/services/accountingService';
import { notificationService } from '../../notifications/services/notificationService';

export const inventoryService = {
    /**
     * Registra un movimiento de inventario.
     * Supabase no soporta transacciones complejas vía Client JS fácilmente sin RPC, 
     * pero para este MVP insertamos el movimiento.
     * 
     * Idealmente, deberíamos tener un Trigger en BD que actualice el stock actual en `products` o una tabla `product_stock`.
     * Por ahora, solo registramos el log (Kardex).
     */
    async createMovement(client: SupabaseClient, movement: InventoryMovement) {
        const { data, error } = await client
            .from('inventory_movements')
            .insert(movement)
            .select()
            .single();

        if (error) throw error;

        // Disparar validación de stock bajo de forma asíncrona (si es una salida)
        if (movement.product_id && (movement.type === 'OUT' || movement.type === 'TRANSFER')) {
            notificationService.checkAndNotifyLowStock(client, movement.product_id)
                .catch(err => console.error("Error in low stock check:", err));
        }

        // Integración Contable Automática
        if (movement.cost > 0 && ['IN', 'OUT'].includes(movement.type)) {
            try {
                const totalValue = movement.qty * movement.cost;
                const entryDate = movement.occurred_at || new Date().toISOString();

                // Obtener cuentas (Hardcoded MVP)
                const inventoryAccount = await accountingService.getAccountByCode(client, '1435'); // Inventario
                const costAccount = await accountingService.getAccountByCode(client, '6135');      // Costo Ventas
                const bridgeAccount = await accountingService.getAccountByCode(client, '9999');     // Puente/Contrapartida

                if (inventoryAccount && costAccount && bridgeAccount) {
                    const lines: any[] = [];
                    const description = `Inv: ${movement.type} - Art: ${movement.product_id?.substring(0, 8)}...`;

                    if (movement.type === 'IN') {
                        // Entrada: Debito Inventario (Activo aumenta) vs Credito Puente
                        lines.push({
                            account_id: inventoryAccount.id,
                            debit: totalValue,
                            credit: 0,
                            description: 'Entrada Almacén'
                        });
                        lines.push({
                            account_id: bridgeAccount.id,
                            debit: 0,
                            credit: totalValue,
                            description: 'Contrapartida Entrada'
                        });
                    } else if (movement.type === 'OUT') {
                        // Salida: Debito Costo (Gasto aumenta) vs Credito Inventario (Activo disminuye)
                        lines.push({
                            account_id: costAccount.id,
                            debit: totalValue,
                            credit: 0,
                            description: 'Costo de Ventas'
                        });
                        lines.push({
                            account_id: inventoryAccount.id,
                            debit: 0,
                            credit: totalValue,
                            description: 'Salida Almacén'
                        });
                    }

                    if (lines.length > 0) {
                        await accountingService.createEntry(client, {
                            entry_date: entryDate,
                            description,
                            lines
                        });
                    }
                } else {
                    console.warn("Inventory Accounting Skipped: Missing accounts 1435, 6135 or 9999");
                }
            } catch (err: any) {
                console.error("Error generating inventory accounting entry:", err);
                // Non-blocking error? Maybe we should see it in tests
                if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
                    console.error("ACCOUNTING ERROR DETAIL:", JSON.stringify(err, null, 2));
                }
            }
        }

        return data as InventoryMovement;
    },

    async getMovements(client: SupabaseClient, productId: string, warehouseId?: string) {
        let query = client
            .from('inventory_movements')
            .select(`
                *,
                warehouses(name)
            `)
            .eq('product_id', productId)
            .order('occurred_at', { ascending: false });

        if (warehouseId) {
            query = query.eq('warehouse_id', warehouseId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as (InventoryMovement & { warehouses: { name: string } })[];
    },

    async getAllMovements(client: SupabaseClient, options?: {
        search?: string,
        type?: string,
        warehouse_id?: string,
        limit?: number
    }) {
        let query = client
            .from('inventory_movements')
            .select(`
                *,
                products(name, sku),
                warehouses(name)
            `)
            .order('occurred_at', { ascending: false });

        if (options?.warehouse_id && options.warehouse_id !== 'all') {
            query = query.eq('warehouse_id', options.warehouse_id);
        }

        if (options?.type && options.type !== 'all') {
            query = query.eq('type', options.type);
        }

        if (options?.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;
        if (error) throw error;

        let filteredData = data;
        if (options?.search) {
            const search = options.search.toLowerCase();
            filteredData = data.filter((m: any) =>
                m.products?.name.toLowerCase().includes(search) ||
                m.products?.sku.toLowerCase().includes(search)
            );
        }

        return filteredData as any[];
    },

    async getProductStock(client: SupabaseClient, productId: string, warehouseId?: string) {
        let query = client
            .from('product_stock')
            .select(`
                *,
                warehouses(name)
            `);

        if (productId) {
            query = query.eq('product_id', productId);
        }

        if (warehouseId) {
            query = query.eq('warehouse_id', warehouseId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as any[];
    },

    async getWarehouses(client: SupabaseClient) {
        const { data, error } = await client.from('warehouses').select('*');
        if (error) throw error;
        return data as Warehouse[];
    },

    async createWarehouse(client: SupabaseClient, warehouse: Partial<Warehouse>) {
        const { data, error } = await client
            .from('warehouses')
            .insert(warehouse)
            .select()
            .single();

        if (error) throw error;
        return data as Warehouse;
    },

    /**
     * Obtiene el stock calculado desde la tabla resumen product_stock.
     */
    async getStock(client: SupabaseClient, productId: string, warehouseId?: string) {
        let query = client.from('product_stock').select('qty');

        query = query.eq('product_id', productId);
        if (warehouseId) {
            query = query.eq('warehouse_id', warehouseId);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (!data || data.length === 0) return 0;

        return data.reduce((acc, curr) => acc + Number(curr.qty), 0);
    },

    /**
     * Obtiene el costo promedio ponderado desde product_stock.
     */
    async getAvgCost(client: SupabaseClient, productId: string, warehouseId: string) {
        const { data, error } = await client
            .from('product_stock')
            .select('avg_cost')
            .eq('product_id', productId)
            .eq('warehouse_id', warehouseId)
            .maybeSingle();

        if (error) throw error;
        return data ? Number(data.avg_cost) : 0;
    },

    /**
     * Obtiene la valorización del inventario consolidada.
     */
    async getValuation(client: SupabaseClient, search: string = ''): Promise<any[]> {
        const { data, error } = await client.rpc('get_inventory_valuation', {
            p_search: search
        });

        if (error) throw error;
        return data as any[];
    },

    async getMovementsStats(client: SupabaseClient) {
        const today = new Date().toISOString().split('T')[0];

        // Count movements today
        const { count, error } = await client
            .from('inventory_movements')
            .select('*', { count: 'exact', head: true })
            .gte('occurred_at', `${today}T00:00:00`);

        if (error) throw error;
        return count || 0;
    },

    async getInventoryTrends(client: SupabaseClient, days: number = 7) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await client
            .from('inventory_movements')
            .select('occurred_at, type, qty')
            .gte('occurred_at', startDate.toISOString())
            .order('occurred_at', { ascending: true });

        if (error) throw error;

        // Group by day and type
        const trends = data.reduce((acc: any, curr: any) => {
            const date = new Date(curr.occurred_at).toLocaleDateString();
            if (!acc[date]) {
                acc[date] = { date, entry: 0, exit: 0 };
            }
            if (curr.type === 'IN') acc[date].entry += Number(curr.qty);
            if (curr.type === 'OUT') acc[date].exit += Number(curr.qty);
            return acc;
        }, {});

        return Object.values(trends);
    }
};
