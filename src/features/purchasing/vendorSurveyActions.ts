"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { vendorSurveySchema, VendorSurveyInput } from "./types/vendorSurvey"
import { computeVendorSurveyScores } from "./utils/vendorSurveyScoring"
import { canViewModule } from "@/shared/lib/moduleGuard"

/** Postgres: violación de restricción única. */
const PG_UNIQUE_VIOLATION = '23505';

/**
 * Registra una encuesta a proveedor respondida por una persona. Los puntajes se
 * calculan aquí (no en el cliente) para que ninguna respuesta guardada quede
 * sin nota o con una nota manipulada desde el navegador.
 */
export async function createVendorSurveyAction(input: VendorSurveyInput) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };
    if (!(await canViewModule('purchasing:vendor-surveys'))) return { error: 'No autorizado' };

    const parsed = vendorSurveySchema.safeParse(input);
    if (!parsed.success) {
        const first = parsed.error.issues[0];
        return { error: first?.message ?? 'Revisa las respuestas del formulario' };
    }

    // party_id llega del cliente validado solo como uuid: la FK a `parties` no
    // respeta RLS (corre con privilegios del dueño de la tabla), así que sin
    // esto se podría referenciar un proveedor de OTRO tenant (oráculo de
    // existencia). Se confirma con el cliente de sesión, cuya RLS de `parties`
    // sí filtra por tenant — mismo patrón que crm_interactions.
    const { data: party } = await supabase
        .from('parties')
        .select('id')
        .eq('id', parsed.data.party_id)
        .maybeSingle();
    if (!party) return { error: 'Proveedor no encontrado' };

    const answers = parsed.data as Record<string, unknown>;
    const scores = computeVendorSurveyScores(answers);

    const { data, error } = await supabase
        .from('vendor_satisfaction_surveys')
        .insert({
            ...parsed.data,
            // Los campos "Otro" solo tienen sentido si se eligió esa opción.
            main_strength_other: parsed.data.main_strength === 'OTRO' ? parsed.data.main_strength_other : null,
            improvement_other: parsed.data.improvement_area === 'OTRO' ? parsed.data.improvement_other : null,
            score_relationship: scores.relationship,
            score_orders_payments: scores.ordersPayments,
            score_commercial: scores.commercial,
            overall_score: scores.overall,
            created_by: user.id,
        })
        .select('id')
        .single();

    if (error) {
        if (error.code === PG_UNIQUE_VIOLATION) {
            return { error: 'Esa persona ya tiene una encuesta registrada para este proveedor en esa fecha.' };
        }
        console.error('[vendorSurveys] createVendorSurvey:', error.message);
        return { error: 'No se pudo guardar la encuesta: ' + error.message };
    }

    revalidatePath('/purchasing/vendor-surveys');
    return { success: true, id: data.id };
}

/**
 * Elimina una encuesta cargada por error. No hay edición: una respuesta
 * corregida a posteriori deja de ser lo que el proveedor dijo; se borra y se
 * vuelve a cargar.
 */
export async function deleteVendorSurveyAction(id: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };
    if (!(await canViewModule('purchasing:vendor-surveys'))) return { error: 'No autorizado' };

    const { error } = await supabase.from('vendor_satisfaction_surveys').delete().eq('id', id);
    if (error) {
        console.error('[vendorSurveys] deleteVendorSurvey:', error.message);
        return { error: 'No se pudo eliminar la encuesta' };
    }

    revalidatePath('/purchasing/vendor-surveys');
    return { success: true };
}
