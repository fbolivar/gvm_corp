import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  listAllTenantsAction,
  getPlatformMetricsAction,
} from '@/features/super-admin/services/superAdminService'
import { SuperAdminDashboard } from './SuperAdminDashboard'

export const metadata = {
  title: 'Super Admin · BC Fabric SAS',
  description: 'Gestión de tenants, licencias y métricas de la plataforma',
}

export const dynamic = 'force-dynamic'

export default async function SuperAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: isAdmin } = await supabase.rpc('is_platform_admin')
  if (!isAdmin) redirect('/dashboard')

  const [tenants, metrics] = await Promise.all([
    listAllTenantsAction(),
    getPlatformMetricsAction(),
  ])

  return <SuperAdminDashboard tenants={tenants} metrics={metrics} />
}
