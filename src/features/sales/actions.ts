"use server"

import { createClient } from "@/lib/supabase/server"
import { documentService } from "@/features/documents/services/documentService"
import { Document, documentSchema } from "@/features/documents/types"
import { checkMarginViolations } from "@/features/documents/marginGuard"
import { revalidatePath } from "next/cache"

/** Ventana en la que dos documentos idénticos se consideran el mismo intento. */
const DUP_WINDOW_SECONDS = 60;

/** Código de Postgres para violación de restricción única. */
const PG_UNIQUE_VIOLATION = '23505';

/**
 * Busca un documento ya creado con esta clave de idempotencia. Si existe, el
 * envío actual es un reenvío del mismo intento (reintento tras error de red,
 * otra pestaña, doble clic que esquivó la guarda del formulario).
 */
async function findByIdempotencyKey(supabase: any, key: string) {
    const { data } = await supabase
        .from('documents')
        .select('id, number, total')
        .eq('idempotency_key', key)
        .maybeSingle();
    return data ?? null;
}

/**
 * Detecta un documento gemelo creado hace segundos SIN la misma clave: mismo
 * tipo, tercero, fecha y total. Cubre el caso de dos pestañas con el mismo
 * pedido, donde cada una trae su propia clave. Se limita a una ventana corta
 * para no bloquear dos documentos idénticos que sí son legítimos (p. ej. dos
 * remisiones iguales al mismo cliente el mismo día, que en los datos reales
 * aparecen separadas por varios minutos).
 */
async function findRecentTwin(supabase: any, doc: Document) {
    const since = new Date(Date.now() - DUP_WINDOW_SECONDS * 1000).toISOString();
    const { data } = await supabase
        .from('documents')
        .select('id, number, total, created_at')
        .eq('doc_type', doc.doc_type)
        .eq('party_id', doc.party_id)
        .eq('issue_date', doc.issue_date)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5);

    const total = Number(doc.total) || 0;
    return (data ?? []).find((d: any) => Math.abs(Number(d.total) - total) < 0.01) ?? null;
}

export async function createSalesDocumentAction(data: Document, redirectPath: string) {
    const supabase = await createClient();

    const parsed = documentSchema.safeParse(data);
    if (!parsed.success) {
        return { error: "Datos inválidos" };
    }

    const doc = parsed.data as Document;
    const idempotencyKey = doc.idempotency_key ?? null;

    // 1. Reenvío del mismo intento → devolver el documento que ya se creó, sin
    //    consumir otro consecutivo. La respuesta es idéntica a la de un guardado
    //    normal, así que el usuario ve su confirmación con el número real.
    if (idempotencyKey) {
        const existing = await findByIdempotencyKey(supabase, idempotencyKey);
        if (existing) {
            revalidatePath(redirectPath);
            return { success: true, data: existing, deduped: true };
        }
    }

    // 2. Gemelo reciente con otra clave (otra pestaña) → no se crea nada y se
    //    nombra el documento existente para que el usuario decida.
    const twin = await findRecentTwin(supabase, doc);
    if (twin) {
        return {
            error: `Ya existe un documento idéntico (${twin.number}) creado hace unos segundos. ` +
                `Revísalo antes de volver a guardar; si de verdad necesitas otro igual, espera un minuto.`,
        };
    }

    const marginError = await checkMarginViolations(supabase, doc as any);
    if (marginError) return { error: marginError };

    try {
        const result = await documentService.createDocument(supabase, doc as any);
        revalidatePath(redirectPath);
        return { success: true, data: result };
    } catch (error: any) {
        // 3. Carrera real: dos peticiones con la misma clave llegaron a la vez y
        //    el índice único rechazó la segunda. El intento ya está guardado.
        if (error?.code === PG_UNIQUE_VIOLATION && idempotencyKey) {
            const existing = await findByIdempotencyKey(supabase, idempotencyKey);
            if (existing) {
                revalidatePath(redirectPath);
                return { success: true, data: existing, deduped: true };
            }
        }
        return { error: error.message };
    }
}

/**
 * Actualiza un documento existente. Solo permite editar borradores (DRAFT) —
 * documentos confirmados/emitidos no se editan.
 */
export async function updateSalesDocumentAction(id: string, data: Document, redirectPath: string) {
    const supabase = await createClient();

    const parsed = documentSchema.safeParse(data);
    if (!parsed.success) {
        return { error: "Datos inválidos" };
    }

    try {
        const { data: existing, error: selErr } = await supabase
            .from('documents')
            .select('status')
            .eq('id', id)
            .single();

        if (selErr || !existing) return { error: 'Documento no encontrado' };
        if (existing.status !== 'DRAFT') {
            return { error: `Solo se pueden editar borradores. Estado actual: ${existing.status}` };
        }

        const marginError = await checkMarginViolations(supabase, parsed.data as any);
        if (marginError) return { error: marginError };

        await documentService.updateDocument(supabase, id, parsed.data as any);
        revalidatePath(redirectPath);
        revalidatePath(`/documents/${id}`);
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}
