'use server';

import { createClient } from '@/lib/supabase/server';
import { fixedAssetService, FixedAsset } from './services/fixedAssetService';
import { revalidatePath } from 'next/cache';

export async function createFixedAssetAction(
    payload: Omit<FixedAsset, 'id' | 'tenant_id' | 'accumulated_depreciation' | 'created_at'>
): Promise<{ id?: string; error?: string }> {
    try {
        const supabase = await createClient();
        const result = await fixedAssetService.create(supabase, payload);
        revalidatePath('/accounting/fixed-assets');
        return { id: result.id };
    } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : 'Error creando activo' };
    }
}

export async function registerDepreciationAction(
    assetId: string,
    months = 1
): Promise<{ newAccumulated?: number; error?: string }> {
    try {
        const supabase = await createClient();
        const result = await fixedAssetService.registerDepreciation(supabase, assetId, months);
        revalidatePath('/accounting/fixed-assets');
        return { newAccumulated: result.newAccumulated };
    } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : 'Error registrando depreciación' };
    }
}

export async function disposeFixedAssetAction(assetId: string): Promise<{ error?: string }> {
    try {
        const supabase = await createClient();
        await fixedAssetService.dispose(supabase, assetId);
        revalidatePath('/accounting/fixed-assets');
        return {};
    } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : 'Error dando de baja activo' };
    }
}
