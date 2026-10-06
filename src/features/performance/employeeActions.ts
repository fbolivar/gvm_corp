'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const acknowledgeSchema = z.object({
    evaluationId: z.string().uuid(),
    observation: z.string().max(2000).optional().nullable(),
});

/** El empleado registra que conoció su resultado y, opcionalmente, una observación. */
export async function acknowledgePerformanceResultAction(input: unknown): Promise<{ success?: true; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const parsed = acknowledgeSchema.safeParse(input);
    if (!parsed.success) return { error: 'Revisa tu observación (máximo 2000 caracteres)' };

    const { error } = await supabase.rpc('acknowledge_performance_result', {
        p_evaluation: parsed.data.evaluationId,
        p_observation: parsed.data.observation ?? null,
    });
    if (error) return { error: error.message };

    revalidatePath('/my-payroll');
    return { success: true };
}
