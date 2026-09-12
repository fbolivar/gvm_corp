'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { commercialService } from './services/commercialService'
import { commercialRequestSchema, type CommercialRequestInput } from './types'

function revalidate(id?: string) {
    revalidatePath('/commercial')
    revalidatePath('/commercial/approvals')
    if (id) revalidatePath(`/commercial/${id}`)
}

export async function createCommercialRequestAction(input: CommercialRequestInput, submit: boolean) {
    const supabase = await createClient()
    const parsed = commercialRequestSchema.safeParse(input)
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message || 'Datos inválidos' }
    }
    try {
        const res = await commercialService.create(supabase, parsed.data, submit)
        revalidate(res.id)
        return { success: true, id: res.id, number: res.number }
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'Error al crear la solicitud' }
    }
}

export async function updateCommercialRequestAction(id: string, input: CommercialRequestInput, submit: boolean) {
    const supabase = await createClient()
    const parsed = commercialRequestSchema.safeParse(input)
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message || 'Datos inválidos' }
    }
    try {
        await commercialService.update(supabase, id, parsed.data)
        if (submit) await commercialService.submit(supabase, id)
        revalidate(id)
        return { success: true, id }
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'Error al actualizar la solicitud' }
    }
}

export async function submitCommercialRequestAction(id: string) {
    const supabase = await createClient()
    try {
        await commercialService.submit(supabase, id)
        revalidate(id)
        return { success: true }
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'Error al enviar' }
    }
}

export async function decideCommercialRequestAction(id: string, decision: 'APPROVED' | 'REJECTED', notes?: string) {
    const supabase = await createClient()
    try {
        await commercialService.decide(supabase, id, decision, notes)
        revalidate(id)
        return { success: true }
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'Error al procesar la decisión' }
    }
}

export async function liquidateCommercialRequestAction(id: string, actuals: { item_id: string; actual_cost: number }[]) {
    const supabase = await createClient()
    try {
        await commercialService.liquidate(supabase, id, actuals)
        revalidate(id)
        return { success: true }
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'Error al liquidar' }
    }
}

export async function uploadCommercialAttachmentAction(requestId: string, formData: FormData) {
    const supabase = await createClient()
    const file = formData.get('file') as File | null
    const kind = String(formData.get('kind') || 'Soporte')
    if (!file || file.size === 0) return { error: 'Selecciona un archivo' }
    if (file.size > 10 * 1024 * 1024) return { error: 'El archivo supera el límite de 10 MB' }
    try {
        await commercialService.addAttachment(supabase, requestId, file, kind)
        revalidate(requestId)
        return { success: true }
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'Error al subir el archivo' }
    }
}

export async function deleteCommercialAttachmentAction(requestId: string, path: string) {
    const supabase = await createClient()
    try {
        await commercialService.removeAttachment(supabase, requestId, path)
        revalidate(requestId)
        return { success: true }
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'Error al eliminar el archivo' }
    }
}

export async function deleteCommercialRequestAction(id: string) {
    const supabase = await createClient()
    try {
        await commercialService.remove(supabase, id)
        revalidate()
        return { success: true }
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'Error al eliminar' }
    }
}
