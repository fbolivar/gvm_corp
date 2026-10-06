import { SupabaseClient } from '@supabase/supabase-js';
import { InventoryMovement, Warehouse } from '../types';

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

        // NO auto-contabilización por movimiento de inventario.
        //
        // Hasta 2026-09-18 había aquí un intento "MVP hardcoded" de generar un
        // asiento por cada movimiento IN/OUT contra las cuentas 1435/6135/9999.
        // Nunca funcionó (0 asientos creados desde julio: 1435 y 6135 están
        // INACTIVAS en el PUC y 9999 no existe), y en vez de fallar en silencio
        // generaba una notificación HIGH por cada movimiento — 1.010 alertas
        // idénticas acumuladas en dos meses, 78 sin leer, desplazando del
        // dashboard alertas que sí importan (ver Alertas Críticas, 2026-09-18).
        //
        // La contabilización real de GVM es por DOCUMENTO (accounting_rules,
        // matriz del contador Andrés — ver salesAccountingEngine.ts), no por
        // movimiento de inventario suelto; esa matriz no incluye costo de venta
        // todavía. Si en el futuro se necesita costear inventario automáticamente,
        // debe ser una regla explícita del contador (cuentas reales del PUC,
        // p. ej. 143501/613505), no cuentas genéricas inventadas, y con una
        // alerta agregada (una vez al día, no una por movimiento).

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
                warehouses(name),
                lot:product_lots(lot_number, batch_code, expiration_date)
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
        if (error) { console.error('[inventory] getWarehouses:', error.message); return [] as Warehouse[]; }
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

        if (error) {
            console.error("get_inventory_valuation RPC unavailable:", error.message, "— using direct query fallback");
            // Fallback: calcular valoración directamente desde inventory_movements
            const { data: fallbackData, error: fbErr } = await client
                .from('inventory_movements')
                .select(`
                    product_id,
                    qty,
                    cost,
                    type,
                    products!inner(id, name, sku)
                `);

            if (fbErr) {
                console.error("Fallback valuation query failed:", fbErr.message);
                return [];
            }

            // Agrupar por producto y calcular stock + costo promedio
            const productMap: Record<string, any> = {};
            for (const m of (fallbackData as any[])) {
                const pid = m.product_id;
                if (!productMap[pid]) {
                    productMap[pid] = {
                        product_id: pid,
                        product_name: m.products?.name || 'Desconocido',
                        sku: m.products?.sku || '',
                        total_qty: 0,
                        total_cost: 0,
                        movement_count: 0
                    };
                }
                const delta = ['IN', 'TRANSFER'].includes(m.type) ? Number(m.qty) : -Number(m.qty);
                productMap[pid].total_qty += delta;
                productMap[pid].total_cost += Number(m.cost) * Number(m.qty);
                productMap[pid].movement_count += 1;
            }

            return Object.values(productMap)
                .filter(p => {
                    if (search) {
                        const s = search.toLowerCase();
                        return p.product_name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s);
                    }
                    return p.total_qty > 0;
                })
                .map(p => ({
                    product_id: p.product_id,
                    product_name: p.product_name,
                    sku: p.sku,
                    total_qty: Math.max(0, p.total_qty),
                    avg_cost: p.movement_count > 0 ? p.total_cost / p.movement_count : 0,
                    total_value: Math.max(0, p.total_qty) * (p.movement_count > 0 ? p.total_cost / p.movement_count : 0)
                }))
                .sort((a, b) => a.product_name.localeCompare(b.product_name));
        }
        return data as any[];
    },

    async getMovementsStats(client: SupabaseClient) {
        const today = new Date().toISOString().split('T')[0];

        // Count movements today
        const { count, error } = await client
            .from('inventory_movements')
            .select('*', { count: 'exact', head: true })
            .gte('occurred_at', `${today}T00:00:00`);

        if (error) { console.error('[inventory] getMovementsStats:', error.message); return 0; }
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

        if (error) { console.error('[inventory] getInventoryTrends:', error.message); return []; }

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
