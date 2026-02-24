"use server"

import { createClient } from "@/lib/supabase/server"
import { productionService } from "./services/productionService"
import { ProductionRecipe, ProductionOrder } from "./types"
import { revalidatePath } from "next/cache"

export async function createRecipeAction(recipe: ProductionRecipe & { items?: any[] }) {
    const supabase = await createClient()
    try {
        const { items, ...recipeData } = recipe;
        const data = await productionService.saveRecipe(supabase, recipeData, items || [])
        revalidatePath('/production')
        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

export async function createOrderAction(order: ProductionOrder) {
    const supabase = await createClient()
    try {
        const data = await productionService.createOrder(supabase, order)
        revalidatePath('/production')
        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}

export async function finishOrderAction(orderId: string, qtyProduced: number) {
    const supabase = await createClient()
    try {
        const data = await productionService.finishOrder(supabase, orderId, qtyProduced)
        revalidatePath('/production')
        revalidatePath('/inventory')
        return { data, error: null }
    } catch (error: any) {
        return { data: null, error: error.message }
    }
}
