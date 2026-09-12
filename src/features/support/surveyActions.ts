"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { surveySchema, SurveyInput } from "./types/survey"
import { computeSurveyScores } from "./utils/surveyScoring"

/** Postgres: violación de restricción única. */
const PG_UNIQUE_VIOLATION = '23505';

/**
 * Registra una encuesta respondida por una persona. Los puntajes se calculan
 * aquí (no en el cliente) para que ninguna respuesta guardada quede sin nota o
 * con una nota manipulada desde el navegador.
 */
export async function createSurveyAction(input: SurveyInput) {
    const supabase = await createClient();

    const parsed = surveySchema.safeParse(input);
    if (!parsed.success) {
        const first = parsed.error.issues[0];
        return { error: first?.message ?? 'Revisa las respuestas del formulario' };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const answers = parsed.data as Record<string, unknown>;
    const scores = computeSurveyScores(answers);

    const { data, error } = await supabase
        .from('satisfaction_surveys')
        .insert({
            ...parsed.data,
            // Los campos "Otro" solo tienen sentido si se eligió esa opción.
            main_strength_other: parsed.data.main_strength === 'OTRO' ? parsed.data.main_strength_other : null,
            improvement_other: parsed.data.improvement_area === 'OTRO' ? parsed.data.improvement_other : null,
            score_service: scores.service,
            score_orders: scores.orders,
            score_product: scores.product,
            overall_score: scores.overall,
            created_by: user.id,
        })
        .select('id')
        .single();

    if (error) {
        if (error.code === PG_UNIQUE_VIOLATION) {
            return { error: 'Esa persona ya tiene una encuesta registrada para este cliente en esa fecha.' };
        }
        console.error('[surveys] createSurvey:', error.message);
        return { error: 'No se pudo guardar la encuesta: ' + error.message };
    }

    revalidatePath('/support/surveys');
    return { success: true, id: data.id };
}

/**
 * Elimina una encuesta cargada por error. No hay edición: una respuesta corregida
 * a posteriori deja de ser lo que el cliente dijo; se borra y se vuelve a cargar.
 */
export async function deleteSurveyAction(id: string) {
    const supabase = await createClient();

    const { error } = await supabase.from('satisfaction_surveys').delete().eq('id', id);
    if (error) {
        console.error('[surveys] deleteSurvey:', error.message);
        return { error: 'No se pudo eliminar la encuesta' };
    }

    revalidatePath('/support/surveys');
    return { success: true };
}
