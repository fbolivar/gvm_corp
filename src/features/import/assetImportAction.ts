'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export interface AssetImportRow {
    code: string
    name: string
    category: string
    acquisition_date: string
    acquisition_cost: number
    useful_life_years: number
    salvage_value: number
    accumulated_depreciation: number
}

export interface AssetImportResult {
    inserted: number
    skipped_existing: string[]
    skipped: number
    errors: string[]
}

const CATEGORY_MAP: Array<[RegExp, string]> = [
    [/terr|lote/i, 'LAND'],
    [/edif|constr|inmueb|bodeg/i, 'BUILDING'],
    [/veh|flota|autom|camion|moto/i, 'VEHICLE'],
    [/maquin|equipo(?!.*comp)|herram|planta/i, 'EQUIPMENT'],
    [/mueb|ensere|oficina/i, 'FURNITURE'],
    [/comput|comp\.|c[oó]mputo|comunicac|tecnolog|hardware/i, 'COMPUTER'],
]
function mapCategory(text: string): string {
    for (const [re, val] of CATEGORY_MAP) if (re.test(text || '')) return val
    return 'OTHER'
}

export async function importFixedAssetsAction(rows: AssetImportRow[]): Promise<AssetImportResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const empty: AssetImportResult = { inserted: 0, skipped_existing: [], skipped: 0, errors: [] }
    const { data: tenantId } = await supabase.rpc('get_my_tenant_id')
    if (!tenantId) return { ...empty, errors: ['No se pudo determinar la empresa.'] }

    const admin = createAdminClient()

    // Códigos ya existentes (para no duplicar)
    const existing = new Set<string>()
    let offset = 0
    for (;;) {
        const { data } = await admin.from('fixed_assets').select('code').eq('tenant_id', tenantId).range(offset, offset + 999)
        if (!data || !data.length) break
        for (const a of data) if (a.code) existing.add(String(a.code).trim().toLowerCase())
        if (data.length < 1000) break
        offset += 1000
    }

    const skipped_existing: string[] = []
    const errors: string[] = []
    let skipped = 0
    const toInsert: Record<string, unknown>[] = []
    const seen = new Set<string>()

    for (const r of rows) {
        const code = (r.code ?? '').trim()
        const name = (r.name ?? '').trim()
        if (!code || !name) { skipped++; continue }
        const key = code.toLowerCase()
        if (existing.has(key) || seen.has(key)) { skipped_existing.push(code); continue }
        seen.add(key)
        toInsert.push({
            tenant_id: tenantId,
            code,
            name,
            category: mapCategory(r.category),
            acquisition_date: r.acquisition_date || new Date().toISOString().split('T')[0],
            acquisition_cost: Number(r.acquisition_cost) || 0,
            salvage_value: Number(r.salvage_value) || 0,
            useful_life_years: Number(r.useful_life_years) || 0,
            accumulated_depreciation: Number(r.accumulated_depreciation) || 0,
            status: 'ACTIVE',
            created_by: user.id,
        })
    }

    let inserted = 0
    for (let i = 0; i < toInsert.length; i += 200) {
        const chunk = toInsert.slice(i, i + 200)
        const { error } = await admin.from('fixed_assets').insert(chunk)
        if (error) errors.push(error.message); else inserted += chunk.length
    }

    revalidatePath('/accounting/fixed-assets')
    return { inserted, skipped_existing, skipped, errors }
}
