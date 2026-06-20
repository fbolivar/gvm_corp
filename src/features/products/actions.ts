'use server'

import { createClient } from "@/lib/supabase/server";
import { productService } from "./services/productService";
import { Product, productSchema } from "./types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { revalidateProductsCache } from "@/shared/lib/cachedLookups";

export async function createProductAction(data: Product) {
    const supabase = await createClient();

    const parsed = productSchema.safeParse(data);
    if (!parsed.success) {
        return { error: "Datos inválidos: " + JSON.stringify(parsed.error.format()) };
    }

    try {
        await productService.createProduct(supabase, parsed.data);
    } catch (error: any) {
        if (error.code === '23505') return { error: 'Ya existe un producto con este SKU.' };
        return { error: error.message };
    }

    revalidateProductsCache();
    revalidatePath('/products');
    redirect('/products');
}

export async function updateProductAction(id: string, data: Product) {
    const supabase = await createClient();

    const parsed = productSchema.safeParse(data);
    if (!parsed.success) {
        return { error: "Datos inválidos" };
    }

    try {
        await productService.updateProduct(supabase, id, parsed.data);
    } catch (error: any) {
        if (error.code === '23505') return { error: 'Ya existe un producto con este SKU.' };
        return { error: error.message };
    }

    revalidateProductsCache();
    revalidatePath('/products');
    revalidatePath(`/products/${id}`);
    redirect('/products');
}
