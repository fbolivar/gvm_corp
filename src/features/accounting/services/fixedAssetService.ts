import { SupabaseClient } from '@supabase/supabase-js';

export type AssetCategory = 'LAND' | 'BUILDING' | 'VEHICLE' | 'EQUIPMENT' | 'FURNITURE' | 'COMPUTER' | 'OTHER';
export type AssetStatus   = 'ACTIVE' | 'DISPOSED' | 'FULLY_DEPRECIATED';

export interface FixedAsset {
    id: string;
    tenant_id: string;
    name: string;
    code: string;
    category: AssetCategory;
    acquisition_date: string;
    acquisition_cost: number;
    salvage_value: number;
    useful_life_years: number;
    accumulated_depreciation: number;
    status: AssetStatus;
    location: string | null;
    serial_number: string | null;
    notes: string | null;
    chart_account_id: string | null;
    created_at: string;
}

export const CATEGORY_LABELS: Record<AssetCategory, string> = {
    LAND:      'Terreno',
    BUILDING:  'Edificio',
    VEHICLE:   'Vehículo',
    EQUIPMENT: 'Maquinaria / Equipo',
    FURNITURE: 'Muebles y Enseres',
    COMPUTER:  'Equipos de Cómputo',
    OTHER:     'Otros',
};

export const DEFAULT_USEFUL_LIFE: Record<AssetCategory, number> = {
    LAND:      0,
    BUILDING:  20,
    VEHICLE:   5,
    EQUIPMENT: 10,
    FURNITURE: 10,
    COMPUTER:  3,
    OTHER:     5,
};

const CATEGORY_COLORS: Record<AssetCategory, string> = {
    LAND:      'bg-emerald-50 text-emerald-700',
    BUILDING:  'bg-slate-100 text-slate-700',
    VEHICLE:   'bg-blue-50 text-blue-700',
    EQUIPMENT: 'bg-indigo-50 text-indigo-700',
    FURNITURE: 'bg-amber-50 text-amber-700',
    COMPUTER:  'bg-violet-50 text-violet-700',
    OTHER:     'bg-slate-50 text-slate-500',
};

export function categoryColor(cat: AssetCategory): string {
    return CATEGORY_COLORS[cat] ?? 'bg-slate-50 text-slate-500';
}

/** Straight-line: annual depreciation */
export function annualDepreciation(asset: Pick<FixedAsset, 'acquisition_cost' | 'salvage_value' | 'useful_life_years' | 'category'>): number {
    if (asset.category === 'LAND' || asset.useful_life_years === 0) return 0;
    return (asset.acquisition_cost - asset.salvage_value) / asset.useful_life_years;
}

export function monthlyDepreciation(asset: Pick<FixedAsset, 'acquisition_cost' | 'salvage_value' | 'useful_life_years' | 'category'>): number {
    return annualDepreciation(asset) / 12;
}

/** Net book value */
export function netBookValue(asset: FixedAsset): number {
    return Math.max(asset.salvage_value, asset.acquisition_cost - asset.accumulated_depreciation);
}

/** Depreciation progress 0–100 */
export function depreciationPct(asset: FixedAsset): number {
    const depreciable = asset.acquisition_cost - asset.salvage_value;
    if (depreciable <= 0) return 100;
    return Math.min(100, (asset.accumulated_depreciation / depreciable) * 100);
}

export const fixedAssetService = {
    async getAll(client: SupabaseClient): Promise<FixedAsset[]> {
        const { data, error } = await client
            .from('fixed_assets')
            .select('*')
            .order('acquisition_date', { ascending: false });
        if (error) { console.error('[fixedAsset] getAll:', error.message); return []; }
        return (data ?? []) as FixedAsset[];
    },

    async create(
        client: SupabaseClient,
        payload: Omit<FixedAsset, 'id' | 'tenant_id' | 'accumulated_depreciation' | 'created_at'>
    ): Promise<FixedAsset> {
        const { data: tenantRow } = await client.from('tenants').select('id').limit(1).single();
        const { data: { user } } = await client.auth.getUser();

        const { data, error } = await client
            .from('fixed_assets')
            .insert({ ...payload, tenant_id: tenantRow?.id, accumulated_depreciation: 0, created_by: user?.id })
            .select()
            .single();
        if (error) throw error;
        return data as FixedAsset;
    },

    /** Add one period (N months) of depreciation */
    async registerDepreciation(client: SupabaseClient, assetId: string, months = 1): Promise<{ newAccumulated: number }> {
        const { data: asset, error: fetchErr } = await client
            .from('fixed_assets')
            .select('*')
            .eq('id', assetId)
            .single();
        if (fetchErr) throw fetchErr;

        const monthly = monthlyDepreciation(asset as FixedAsset);
        const depreciable = asset.acquisition_cost - asset.salvage_value;
        const current = Number(asset.accumulated_depreciation);
        const added = Math.min(monthly * months, depreciable - current);
        const newAccumulated = current + Math.max(0, added);

        const newStatus: AssetStatus = newAccumulated >= depreciable ? 'FULLY_DEPRECIATED' : 'ACTIVE';

        const { error: updErr } = await client
            .from('fixed_assets')
            .update({ accumulated_depreciation: newAccumulated, status: newStatus })
            .eq('id', assetId);
        if (updErr) throw updErr;

        return { newAccumulated };
    },

    async dispose(client: SupabaseClient, assetId: string): Promise<void> {
        const { error } = await client
            .from('fixed_assets')
            .update({ status: 'DISPOSED' })
            .eq('id', assetId);
        if (error) throw error;
    },
};
