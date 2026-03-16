"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { radianService, RadianEventCode } from "../services/radianService"

export async function registerRadianEventAction(electronicDocId: string, eventCode: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autenticado" }

    try {
        const event = await radianService.registerEvent(supabase, electronicDocId, eventCode as RadianEventCode)
        revalidatePath('/dian')
        return { success: true, eventId: event.id }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Error al registrar evento'
        return { error: msg }
    }
}

export async function sendRadianEventAction(eventId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autenticado" }

    try {
        const result = await radianService.sendEvent(supabase, eventId)
        revalidatePath('/dian')
        return result.success
            ? { success: true, message: result.message }
            : { error: result.message }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Error al enviar evento'
        return { error: msg }
    }
}
