import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Cuántos soportes tiene cada documento. Se consulta una sola vez por página
 * (no por fila) para alimentar el indicador de los listados.
 */
export async function getAttachmentCounts(
    client: SupabaseClient,
    documentIds: string[]
): Promise<Record<string, number>> {
    const counts: Record<string, number> = {}
    if (documentIds.length === 0) return counts

    // En bloques para no exceder el largo máximo de la URL de PostgREST.
    const CHUNK = 200
    for (let i = 0; i < documentIds.length; i += CHUNK) {
        const { data, error } = await client
            .from('document_attachments')
            .select('document_id')
            .in('document_id', documentIds.slice(i, i + CHUNK))
        if (error) {
            console.error('[attachments] conteo falló:', error.message)
            continue
        }
        for (const row of data ?? []) {
            const id = (row as { document_id: string }).document_id
            counts[id] = (counts[id] ?? 0) + 1
        }
    }
    return counts
}
