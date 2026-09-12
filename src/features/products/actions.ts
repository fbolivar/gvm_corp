'use server'

import { createClient } from "@/lib/supabase/server";
import { productService } from "./services/productService";
import { Product, productSchema } from "./types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { revalidateProductsCache } from "@/shared/lib/cachedLookups";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Guarda los precios por lista de un producto. La lista por defecto se sincroniza
 * con el precio de venta (selling_price). Solo escribe las listas recibidas.
 */
async function upsertProductPrices(
    supabase: SupabaseClient,
    productId: string,
    sellingPrice: number,
    prices?: Record<string, number>,
): Promise<void> {
    const { data: tenantId } = await supabase.rpc('get_my_tenant_id');
    if (!tenantId) return;
    const admin = createAdminClient();

    const { data: lists } = await admin.from('price_lists').select('id, is_default').eq('tenant_id', tenantId);
    if (!lists) return;

    const desired: Record<string, number> = {};
    for (const l of lists) {
        if (l.is_default) desired[l.id as string] = Number(sellingPrice) || 0;
        else {
            const v = prices?.[l.id as string];
            if (v !== undefined && v !== null && isFinite(Number(v))) desired[l.id as string] = Number(v);
        }
    }

    const { data: existing } = await admin.from('price_list_items').select('id, price_list_id').eq('product_id', productId);
    const byList = new Map((existing ?? []).map((i) => [i.price_list_id as string, i.id as string]));

    for (const [listId, price] of Object.entries(desired)) {
        const itemId = byList.get(listId);
        if (itemId) await admin.from('price_list_items').update({ unit_price: price }).eq('id', itemId);
        else await admin.from('price_list_items').insert({ tenant_id: tenantId, price_list_id: listId, product_id: productId, unit_price: price });
    }
}

/** ¿El usuario actual puede fijar/editar el IVA de productos? Admin siempre; otros por permiso. */
async function userCanEditTax(supabase: SupabaseClient): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    try {
        const { data: isAdmin } = await supabase.rpc('is_system_admin');
        if (isAdmin === true) return true;
    } catch { /* ignora */ }
    const { data } = await supabase
        .from('user_tenants')
        .select('can_edit_product_tax')
        .eq('user_id', user.id)
        .maybeSingle();
    return !!data?.can_edit_product_tax;
}

/** Expuesta al cliente para mostrar/ocultar el campo de IVA editable. */
export async function getProductTaxPermissionAction(): Promise<boolean> {
    const supabase = await createClient();
    return userCanEditTax(supabase);
}

export async function createProductAction(data: Product, prices?: Record<string, number>) {
    const supabase = await createClient();

    const parsed = productSchema.safeParse(data);
    if (!parsed.success) {
        return { error: "Datos inválidos: " + JSON.stringify(parsed.error.format()) };
    }

    // Solo usuarios autorizados fijan el IVA; el resto queda en la tarifa general.
    if (!(await userCanEditTax(supabase))) {
        parsed.data.tax_category = 'IVA_19';
    }

    let created: Product | undefined;
    try {
        created = await productService.createProduct(supabase, parsed.data);
    } catch (error: any) {
        if (error.code === '23505') return { error: 'Ya existe un producto con este SKU.' };
        return { error: error.message };
    }

    if (created?.id) await upsertProductPrices(supabase, created.id, Number(parsed.data.selling_price) || 0, prices);

    revalidateProductsCache();
    revalidatePath('/products');
    redirect('/products');
}

export async function updateProductAction(id: string, data: Product, prices?: Record<string, number>) {
    const supabase = await createClient();

    const parsed = productSchema.safeParse(data);
    if (!parsed.success) {
        return { error: "Datos inválidos" };
    }

    // Si no está autorizado, conserva el IVA que ya tenía el producto (no lo puede cambiar).
    if (!(await userCanEditTax(supabase))) {
        const existing = await productService.getProductById(supabase, id);
        if (existing?.tax_category) parsed.data.tax_category = existing.tax_category;
    }

    try {
        await productService.updateProduct(supabase, id, parsed.data);
    } catch (error: any) {
        if (error.code === '23505') return { error: 'Ya existe un producto con este SKU.' };
        return { error: error.message };
    }

    await upsertProductPrices(supabase, id, Number(parsed.data.selling_price) || 0, prices);

    revalidateProductsCache();
    revalidatePath('/products');
    revalidatePath(`/products/${id}`);
    redirect('/products');
}
