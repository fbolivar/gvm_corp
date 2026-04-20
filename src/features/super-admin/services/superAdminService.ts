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
  slug: string | null
  custom_domain: string | null
  logo_url: string | null
  primary_color: string | null
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

export interface PlatformExecMetrics {
  total_tenants: number
  active_licenses: number
  expired_licenses: number
  suspended_tenants: number
  total_users: number
  tenants_created_this_month: number
  tenants_created_last_month: number
  mrr_estimated: number
  arr_projected: number
  trials_active: number
  trials_expiring_7d: number
  licenses_expiring_30d: number
  licenses_expiring_7d: number
  plans: {
    enterprise: number
    professional: number
    starter: number
    trial: number
  }
}

export interface TenantsTrendRow {
  month_label: string
  month_start: string
  tenants_created: number
}

export type RiskLevel = 'high' | 'medium' | 'low'

export interface TenantRisk {
  tenant_id: string
  tenant_name: string
  risk_level: RiskLevel
  reasons: string[]
  license_plan: string | null
  valid_until: string | null
  days_to_expire: number | null
  users_count: number
  max_users: number
}

export interface PlatformActivityRow {
  log_id: string
  tenant_id: string | null
  tenant_name: string | null
  actor_user_id: string | null
  actor_name: string | null
  action: string
  entity: string
  entity_id: string | null
  created_at: string
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

export async function getPlatformExecMetricsAction(): Promise<PlatformExecMetrics> {
  await requirePlatformAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_platform_exec_metrics')
  if (error) throw new Error(error.message)
  return data as PlatformExecMetrics
}

export async function getTenantsTrendAction(months = 6): Promise<TenantsTrendRow[]> {
  await requirePlatformAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_tenants_trend', { p_months: months })
  if (error) throw new Error(error.message)
  return (data as TenantsTrendRow[]) || []
}

export async function getTenantsRiskAction(): Promise<TenantRisk[]> {
  await requirePlatformAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_tenants_risk')
  if (error) throw new Error(error.message)
  return (data as TenantRisk[]) || []
}

export async function getPlatformActivityAction(limit = 20): Promise<PlatformActivityRow[]> {
  await requirePlatformAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_platform_activity', { p_limit: limit })
  if (error) throw new Error(error.message)
  return (data as PlatformActivityRow[]) || []
}

export interface PlatformReportTenant {
  tenant_id: string
  tenant_name: string
  nit: string | null
  created_at: string
  plan: string | null
  status: string | null
  valid_until: string | null
  max_users: number | null
  users_count: number
  mrr_usd: number
}

export interface PlatformReportDay {
  date: string
  count: number
}

export interface PlatformReport {
  new_tenants: number
  new_licenses: number
  suspended_in_range: number
  revenue_mrr_snapshot: number
  tenants: PlatformReportTenant[]
  daily_series: PlatformReportDay[]
  plan_distribution: {
    enterprise: number
    professional: number
    starter: number
    trial: number
  }
}

export async function getPlatformReportAction(
  from: string,
  to: string,
  plan: string | null = null,
  status: string | null = null,
): Promise<PlatformReport> {
  await requirePlatformAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_platform_report', {
    p_from: from,
    p_to: to,
    p_plan: plan,
    p_status: status,
  })
  if (error) throw new Error(error.message)
  return data as PlatformReport
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
    // Uses RPC to find user by email (fast, avoids listUsers which is slow)
    let userId: string | undefined
    const supabaseRpc = await createClient()
    const { data: existingUserId } = await supabaseRpc.rpc('admin_find_user_by_email', {
      p_email: input.admin_email,
    })

    if (existingUserId) {
      userId = existingUserId as string
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
      admin_temp_password: existingUserId ? undefined : tempPassword,
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

// ─── Tenant Detail ───────────────────────────────────────────────────────────

export interface TenantDetail {
  tenant: {
    id: string
    name: string
    nit: string
    dv: string | null
    created_at: string
  }
  license: {
    id: string
    license_key: string
    plan: string
    status: string
    modules_enabled: string[]
    max_users: number
    valid_from: string
    valid_until: string
    activated_at: string | null
    issued_by: string
  } | null
  users: Array<{
    id: string
    email: string
    full_name: string | null
    role: string
    status: string
    joined_at: string
  }>
  stats: {
    total_documents: number
    total_parties: number
    total_products: number
    total_employees: number
  }
}

export async function getTenantDetailAction(tenantId: string): Promise<TenantDetail | null> {
  await requirePlatformAdmin()
  const admin = createAdminClient()

  // Tenant info
  const { data: tenant, error: tenantErr } = await admin
    .from('tenants')
    .select('id, name, nit, dv, created_at')
    .eq('id', tenantId)
    .single()

  if (tenantErr || !tenant) return null

  // License
  const { data: license } = await admin
    .from('tenant_licenses')
    .select('id, license_key, plan, status, modules_enabled, max_users, valid_from, valid_until, activated_at, issued_by')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Users in this tenant (join with profiles and auth.users via user_tenants)
  const { data: userTenants } = await admin
    .from('user_tenants')
    .select('user_id, role, status, created_at')
    .eq('tenant_id', tenantId)

  const users: TenantDetail['users'] = []
  if (userTenants && userTenants.length > 0) {
    for (const ut of userTenants) {
      // Get profile
      const { data: profile } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', ut.user_id)
        .maybeSingle()

      // Get auth user for email
      const { data: authUser } = await admin.auth.admin.getUserById(ut.user_id)

      users.push({
        id: ut.user_id,
        email: authUser?.user?.email || '—',
        full_name: profile?.full_name || null,
        role: ut.role,
        status: ut.status,
        joined_at: ut.created_at,
      })
    }
  }

  // Stats — count rows per tenant
  const [docsResult, partiesResult, productsResult, employeesResult] = await Promise.all([
    admin.from('documents').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    admin.from('parties').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    admin.from('products').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    admin.from('employees').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
  ])

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      nit: tenant.nit ?? '',
      dv: tenant.dv ?? null,
      created_at: tenant.created_at,
    },
    license: license
      ? {
          id: license.id,
          license_key: license.license_key,
          plan: license.plan,
          status: license.status,
          modules_enabled: license.modules_enabled ?? [],
          max_users: license.max_users,
          valid_from: license.valid_from,
          valid_until: license.valid_until,
          activated_at: license.activated_at ?? null,
          issued_by: license.issued_by ?? '',
        }
      : null,
    users,
    stats: {
      total_documents: docsResult.count ?? 0,
      total_parties: partiesResult.count ?? 0,
      total_products: productsResult.count ?? 0,
      total_employees: employeesResult.count ?? 0,
    },
  }
}

export async function updateTenantAction(
  tenantId: string,
  data: { name?: string; nit?: string; dv?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePlatformAdmin()
    const admin = createAdminClient()

    const { error } = await admin
      .from('tenants')
      .update(data)
      .eq('id', tenantId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/super-admin')
    revalidatePath(`/super-admin/tenants/${tenantId}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function deleteTenantAction(
  tenantId: string,
  confirmNit: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePlatformAdmin()
    const admin = createAdminClient()

    // Verify NIT matches
    const { data: tenant } = await admin
      .from('tenants')
      .select('nit')
      .eq('id', tenantId)
      .single()

    if (!tenant) return { success: false, error: 'Tenant no encontrado' }
    if (tenant.nit !== confirmNit) {
      return { success: false, error: 'El NIT ingresado no coincide. Eliminación cancelada.' }
    }

    const { error } = await admin.from('tenants').delete().eq('id', tenantId)
    if (error) return { success: false, error: error.message }

    revalidatePath('/super-admin')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function resetUserPasswordAction(
  userId: string,
  _tenantId: string
): Promise<{ success: boolean; tempPassword?: string; error?: string }> {
  try {
    await requirePlatformAdmin()
    const admin = createAdminClient()

    const tempPassword = generateTempPassword()

    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: tempPassword,
    })

    if (error) {
      const { translateAuthError } = await import('@/shared/lib/auth-errors')
      return { success: false, error: translateAuthError(error.message) }
    }

    return { success: true, tempPassword }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function removeUserFromTenantAction(
  userId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePlatformAdmin()
    const admin = createAdminClient()

    const { error } = await admin
      .from('user_tenants')
      .delete()
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/super-admin')
    revalidatePath(`/super-admin/tenants/${tenantId}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
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

// ─── Platform Config (BC Fabric master branding) ────────────────────────────

export interface PlatformConfig {
  id: string
  master_logo_url: string | null
  master_favicon_url: string | null
  company_name: string
  legal_name: string
  tax_id: string | null
  support_email: string
  support_phone: string | null
  website: string
}

export async function getPlatformConfigAction(): Promise<PlatformConfig | null> {
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_platform_config').maybeSingle<PlatformConfig>()
  return data
}

export async function updatePlatformConfigAction(
  updates: Partial<PlatformConfig>
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePlatformAdmin()
    const admin = createAdminClient()
    const { error } = await admin.from('platform_config').update(updates).not('id', 'is', null)
    if (error) return { success: false, error: error.message }
    revalidatePath('/super-admin')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function uploadPlatformLogoAction(
  fileBase64: string,
  fileName: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    await requirePlatformAdmin()
    const admin = createAdminClient()

    const buffer = Buffer.from(fileBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
    const ext = fileName.split('.').pop()?.toLowerCase() || 'png'
    const path = `platform/logo-${Date.now()}.${ext}`

    const { error: uploadErr } = await admin.storage
      .from('tenant-branding')
      .upload(path, buffer, { contentType: `image/${ext}`, upsert: true })

    if (uploadErr) return { success: false, error: uploadErr.message }

    const { data: publicUrl } = admin.storage.from('tenant-branding').getPublicUrl(path)
    await admin.from('platform_config').update({ master_logo_url: publicUrl.publicUrl }).not('id', 'is', null)

    revalidatePath('/super-admin')
    return { success: true, url: publicUrl.publicUrl }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ─── Branding & Custom Domain ────────────────────────────────────────────────

export interface TenantBranding {
  slug: string | null
  custom_domain: string | null
  logo_url: string | null
  favicon_url: string | null
  primary_color: string
  accent_color: string
  app_name: string | null
}

export async function getTenantBrandingAction(tenantId: string): Promise<TenantBranding | null> {
  await requirePlatformAdmin()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tenants')
    .select('slug, custom_domain, logo_url, favicon_url, primary_color, accent_color, app_name')
    .eq('id', tenantId)
    .single()
  if (error || !data) return null
  return data as TenantBranding
}

export async function updateTenantBrandingAction(
  tenantId: string,
  data: Partial<TenantBranding>
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePlatformAdmin()
    const admin = createAdminClient()

    // Validate slug format (only lowercase alphanumeric + dash)
    if (data.slug !== undefined && data.slug !== null && data.slug !== '') {
      if (!/^[a-z0-9-]{2,30}$/.test(data.slug)) {
        return { success: false, error: 'El slug debe ser minúsculas, números y guiones (2-30 caracteres)' }
      }
    }

    // Normalize custom_domain (remove protocol, trailing slashes, www)
    if (data.custom_domain !== undefined && data.custom_domain !== null && data.custom_domain !== '') {
      const normalized = data.custom_domain
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '')
        .replace(/^www\./, '')
        .toLowerCase()
        .trim()
      data.custom_domain = normalized
    }

    const { error } = await admin.from('tenants').update(data).eq('id', tenantId)
    if (error) return { success: false, error: error.message }

    revalidatePath('/super-admin')
    revalidatePath(`/super-admin/tenants/${tenantId}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

export async function uploadTenantLogoAction(
  tenantId: string,
  fileBase64: string,
  fileName: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    await requirePlatformAdmin()
    const admin = createAdminClient()

    // Decode base64
    const buffer = Buffer.from(fileBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
    const ext = fileName.split('.').pop()?.toLowerCase() || 'png'
    const path = `${tenantId}/logo-${Date.now()}.${ext}`

    const { error: uploadErr } = await admin.storage
      .from('tenant-branding')
      .upload(path, buffer, {
        contentType: `image/${ext}`,
        upsert: true,
      })

    if (uploadErr) return { success: false, error: uploadErr.message }

    const { data: publicUrl } = admin.storage.from('tenant-branding').getPublicUrl(path)

    await admin.from('tenants').update({ logo_url: publicUrl.publicUrl }).eq('id', tenantId)

    revalidatePath(`/super-admin/tenants/${tenantId}`)
    return { success: true, url: publicUrl.publicUrl }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}
