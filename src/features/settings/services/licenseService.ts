import { createClient } from '@/lib/supabase/client'

export interface TenantLicense {
  id: string
  tenant_id: string
  license_key: string
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'TRIAL'
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED'
  modules_enabled: string[]
  max_users: number
  company_name: string
  company_nit: string
  issued_at: string
  valid_from: string
  valid_until: string
  activated_at: string | null
  last_verified_at: string | null
  issued_by: string
  notes: string | null
}

export type LicenseStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'SUSPENDED' | 'NOT_FOUND'

export async function getLicense(): Promise<TenantLicense | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('tenant_licenses')
    .select('*')
    .limit(1)
    .single()
  return data
}

export function getLicenseStatus(license: TenantLicense | null): LicenseStatus {
  if (!license) return 'NOT_FOUND'
  if (license.status === 'SUSPENDED') return 'SUSPENDED'
  if (license.status === 'CANCELLED' || license.status === 'EXPIRED') return 'EXPIRED'

  const now = new Date()
  const validUntil = new Date(license.valid_until)
  const daysLeft = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysLeft <= 0) return 'EXPIRED'
  if (daysLeft <= 30) return 'EXPIRING_SOON'
  return 'VALID'
}

export function getDaysRemaining(license: TenantLicense): number {
  const now = new Date()
  const validUntil = new Date(license.valid_until)
  return Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function getPlanLabel(plan: string): string {
  const labels: Record<string, string> = {
    STARTER: 'Starter',
    PROFESSIONAL: 'Professional',
    ENTERPRISE: 'Enterprise',
    TRIAL: 'Prueba Gratuita',
  }
  return labels[plan] || plan
}

export function getModuleLabel(key: string): string {
  const labels: Record<string, string> = {
    dashboard: 'Dashboard',
    analytics: 'Analítica BI',
    sales: 'Ventas y Facturación',
    inventory: 'Inventario y Bodegas',
    crm: 'CRM y Pipeline',
    purchasing: 'Compras',
    documents: 'Documentos DIAN',
    production: 'Producción',
    payroll: 'Nómina y RRHH',
    accounting: 'Contabilidad',
    logistics: 'Logística',
    settings: 'Configuración',
  }
  return labels[key] || key
}
