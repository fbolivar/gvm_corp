'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ─── Auth guard ──────────────────────────────────────────────────────────────

async function requirePlatformAdmin(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: isAdmin } = await supabase.rpc('is_platform_admin')
  if (!isAdmin) throw new Error('Acceso denegado: se requiere platform admin')

  return user.id
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TenantRow {
  tenant_id: string
  tenant_name: string
  nit: string | null
  created_at: string
  license_plan: string
  license_status: string
  license_valid_until: string | null
  max_users: number
  users_count: number
  documents_count: number
}

export interface PlatformMetrics {
  total_tenants: number
  active_licenses: number
  expired_licenses: number
  total_users: number
  tenants_created_this_month: number
  plans: {
    enterprise: number
    professional: number
    starter: number
    trial: number
  }
}

export interface NewTenantInput {
  company_name: string
  nit: string
  dv: string
  admin_email: string
  admin_full_name: string
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'TRIAL'
  max_users: number
  modules_enabled: string[]
  valid_from: string
  valid_until: string
}

export interface CreateTenantResult {
  success: boolean
  tenant_id?: string
  license_key?: string
  admin_user_id?: string
  admin_temp_password?: string
  error?: string
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function listAllTenantsAction(): Promise<TenantRow[]> {
  await requirePlatformAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('list_all_tenants_admin')
  if (error) throw new Error(error.message)
  return (data as TenantRow[]) || []
}

export async function getPlatformMetricsAction(): Promise<PlatformMetrics> {
  await requirePlatformAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_platform_metrics')
  if (error) throw new Error(error.message)
  return data as PlatformMetrics
}

/**
 * Create a new tenant with license and first admin user.
 * Uses admin client to bypass RLS during atomic setup.
 */
export async function createTenantAction(input: NewTenantInput): Promise<CreateTenantResult> {
  try {
    await requirePlatformAdmin()
    const admin = createAdminClient()

    // 1. Generate license key
    const licenseKey = generateLicenseKey()
    const tempPassword = generateTempPassword()

    // 2. Create tenant
    const { data: tenant, error: tenantErr } = await admin
      .from('tenants')
      .insert({
        name: input.company_name,
        nit: input.nit,
        dv: input.dv,
      })
      .select('id')
      .single()

    if (tenantErr || !tenant) {
      return { success: false, error: `Error creando tenant: ${tenantErr?.message}` }
    }

    const tenantId = tenant.id

    // 3. Create auth user (or use existing if email already registered)
    let userId: string | undefined
    const { data: existingUsers } = await admin.auth.admin.listUsers()
    const existing = existingUsers?.users.find(u => u.email === input.admin_email)

    if (existing) {
      userId = existing.id
    } else {
      const { data: newUser, error: userErr } = await admin.auth.admin.createUser({
        email: input.admin_email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: input.admin_full_name },
      })
      if (userErr || !newUser?.user) {
        // Rollback tenant
        await admin.from('tenants').delete().eq('id', tenantId)
        return { success: false, error: `Error creando usuario: ${userErr?.message}` }
      }
      userId = newUser.user.id
    }

    // 4. Ensure profile exists
    await admin
      .from('profiles')
      .upsert(
        { id: userId, full_name: input.admin_full_name },
        { onConflict: 'id', ignoreDuplicates: false }
      )

    // 5. Assign user to tenant as SUPER ADMINISTRADOR
    const { data: role } = await admin
      .from('app_roles')
      .select('id')
      .eq('name', 'SUPER ADMINISTRADOR')
      .single()

    await admin.from('user_tenants').insert({
      tenant_id: tenantId,
      user_id: userId,
      role: 'SUPER ADMINISTRADOR',
      role_id: role?.id || null,
      status: 'active',
    })

    // 6. Create license
    const { error: licErr } = await admin.from('tenant_licenses').insert({
      tenant_id: tenantId,
      license_key: licenseKey,
      plan: input.plan,
      status: 'ACTIVE',
      modules_enabled: input.modules_enabled,
      max_users: input.max_users,
      company_name: input.company_name,
      company_nit: input.nit,
      valid_from: input.valid_from,
      valid_until: input.valid_until,
      activated_at: new Date().toISOString(),
      issued_by: 'BC Fabric SAS - Panel Super Admin',
    })

    if (licErr) {
      // Rollback
      await admin.from('user_tenants').delete().eq('tenant_id', tenantId)
      await admin.from('tenants').delete().eq('id', tenantId)
      return { success: false, error: `Error creando licencia: ${licErr.message}` }
    }

    revalidatePath('/super-admin')

    return {
      success: true,
      tenant_id: tenantId,
      license_key: licenseKey,
      admin_user_id: userId,
      admin_temp_password: existing ? undefined : tempPassword,
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function updateTenantLicenseAction(
  tenantId: string,
  updates: {
    plan?: string
    status?: string
    valid_until?: string
    max_users?: number
    modules_enabled?: string[]
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePlatformAdmin()
    const admin = createAdminClient()

    const { error } = await admin
      .from('tenant_licenses')
      .update(updates)
      .eq('tenant_id', tenantId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/super-admin')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function suspendTenantAction(tenantId: string): Promise<{ success: boolean; error?: string }> {
  return updateTenantLicenseAction(tenantId, { status: 'SUSPENDED' })
}

export async function reactivateTenantAction(tenantId: string): Promise<{ success: boolean; error?: string }> {
  return updateTenantLicenseAction(tenantId, { status: 'ACTIVE' })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateLicenseKey(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const blocks: string[] = []
  for (let b = 0; b < 4; b++) {
    let block = ''
    for (let i = 0; i < 4; i++) {
      block += chars[Math.floor(Math.random() * chars.length)]
    }
    blocks.push(block)
  }
  return `GVM-${blocks.join('-')}`
}

function generateTempPassword(): string {
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  const digits = '23456789'
  const special = '!@#$%'
  const all = lower + upper + digits + special
  let pwd = lower[Math.floor(Math.random() * lower.length)]
  pwd += upper[Math.floor(Math.random() * upper.length)]
  pwd += digits[Math.floor(Math.random() * digits.length)]
  pwd += special[Math.floor(Math.random() * special.length)]
  for (let i = 0; i < 8; i++) {
    pwd += all[Math.floor(Math.random() * all.length)]
  }
  // Shuffle
  return pwd.split('').sort(() => Math.random() - 0.5).join('')
}
