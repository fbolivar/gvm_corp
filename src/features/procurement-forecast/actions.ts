'use server';

import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { canViewModule } from '@/shared/lib/moduleGuard';
import { fetchAllRows } from '@/shared/lib/fetchAllRows';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const rowSchema = z.object({
    salespersonLabel: z.string().min(1).max(200),
    sku: z.string().min(1).max(64),
    productLabel: z.string().min(1).max(300),
    year: z.number().int().min(2000).max(2100),
    month: z.number().int().min(1).max(12),
    qty: z.number().finite(),
    valueCop: z.number().finite(),
});
const batchSchema = z.array(rowSchema).min(1).max(3000);

export interface ImportResult {
    success?: true;
    error?: string;
    imported_rows?: number;
    months?: string[];
    unmatched_products?: string[];
    unmapped_salespeople?: string[];
}

function normalize(s: string): string {
    return (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Importa un lote agregado del informe de Viviana a sales_history_import.
 * Resuelve el producto por SKU y el comercial por la tabla de alias (con
 * automatch por nombre dentro del tenant). Lo que no mapee se reporta.
 */
export async function importSalesReportAction(rows: unknown): Promise<ImportResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) return { error: 'Tenant no encontrado' };
    if (!(await canViewModule('purchasing'))) return { error: 'No tienes permiso sobre el módulo de Compras' };

    const { data: canEdit } = await supabase.rpc('is_purchasing_manager');
    if (canEdit !== true) return { error: 'No tienes permiso de edición sobre Compras; pídeselo a un administrador' };

    const parsed = batchSchema.safeParse(rows);
    if (!parsed.success) return { error: 'El lote tiene filas inválidas o supera el máximo permitido (3.000)' };
    const batch = parsed.data;

    // 1. Productos: SKU → id (paginado, hay >1.000)
    const products = await fetchAllRows<{ id: string; sku: string | null }>(
        ({ from, to }) => supabase.from('products').select('id, sku').order('id').range(from, to),
        { label: 'products-sku' },
    );
    const skuToId = new Map<string, string>();
    for (const p of products) if (p.sku) skuToId.set(p.sku.trim().toUpperCase(), p.id);

    // 2. Alias existentes + perfiles del tenant para automatch (filtrado por tenant)
    const [{ data: aliases }, { data: members }] = await Promise.all([
        supabase.from('forecast_salesperson_aliases').select('report_label, salesperson_id'),
        supabase.from('user_tenants').select('user_id, profiles(id, full_name)').eq('tenant_id', tenant.id).eq('status', 'active'),
    ]);
    const aliasMap = new Map<string, string | null>();
    for (const a of aliases ?? []) aliasMap.set(a.report_label, a.salesperson_id);

    // Mapa nombre→id, pero si un nombre normalizado colisiona (homónimos/duplicados), se marca ambiguo y no se usa.
    const nameToProfile = new Map<string, string>();
    const ambiguousNames = new Set<string>();
    for (const m of members ?? []) {
        const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        const fullName = (prof as { full_name?: string } | null)?.full_name;
        const id = (prof as { id?: string } | null)?.id;
        if (!fullName || !id) continue;
        const key = normalize(fullName);
        if (nameToProfile.has(key) && nameToProfile.get(key) !== id) { ambiguousNames.add(key); continue; }
        nameToProfile.set(key, id);
    }

    // 3. Resolver filas + alias nuevos
    const unmatchedProducts = new Set<string>();
    const unmappedSalespeople = new Set<string>();
    const newAliases: { tenant_id: string; report_label: string; salesperson_id: string | null }[] = [];
    const seenLabels = new Set<string>();
    const months = new Set<string>();

    const toInsert = batch.map(r => {
        const productId = skuToId.get(r.sku.trim().toUpperCase()) ?? null;
        if (!productId) unmatchedProducts.add(r.sku);

        let salespersonId: string | null | undefined = aliasMap.get(r.salespersonLabel);
        if (salespersonId === undefined) {
            const key = normalize(r.salespersonLabel);
            salespersonId = ambiguousNames.has(key) ? null : (nameToProfile.get(key) ?? null);
            if (!seenLabels.has(r.salespersonLabel)) {
                seenLabels.add(r.salespersonLabel);
                newAliases.push({ tenant_id: tenant.id, report_label: r.salespersonLabel, salesperson_id: salespersonId });
            }
        }
        if (!salespersonId) unmappedSalespeople.add(r.salespersonLabel);
        months.add(`${r.year}-${String(r.month).padStart(2, '0')}`);

        return {
            tenant_id: tenant.id,
            year: r.year,
            month: r.month,
            salesperson_label: r.salespersonLabel,
            sku: r.sku,
            product_label: r.productLabel,
            product_id: productId,
            qty: r.qty,
            value_cop: r.valueCop,
        };
    });

    if (newAliases.length > 0) {
        const { error: aliasErr } = await supabase
            .from('forecast_salesperson_aliases')
            .upsert(newAliases, { onConflict: 'tenant_id,report_label', ignoreDuplicates: true });
        if (aliasErr) return { error: 'No se pudieron registrar los vendedores del informe' };
    }

    const BATCH = 500;
    for (let i = 0; i < toInsert.length; i += BATCH) {
        const chunk = toInsert.slice(i, i + BATCH);
        const { error } = await supabase
            .from('sales_history_import')
            .upsert(chunk, { onConflict: 'tenant_id,year,month,salesperson_label,sku' });
        if (error) return { error: 'No se pudo guardar el histórico de ventas' };
    }

    revalidatePath('/purchasing/forecast');
    return {
        success: true,
        imported_rows: toInsert.length,
        months: [...months].sort(),
        unmatched_products: [...unmatchedProducts].sort(),
        unmapped_salespeople: [...unmappedSalespeople].sort(),
    };
}
