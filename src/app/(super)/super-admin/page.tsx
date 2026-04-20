import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  listAllTenantsAction,
  getPlatformExecMetricsAction,
  getTenantsTrendAction,
  getTenantsRiskAction,
  getPlatformActivityAction,
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

  const [tenants, execMetrics, trend, risks, activity] = await Promise.all([
    listAllTenantsAction(),
    getPlatformExecMetricsAction(),
    getTenantsTrendAction(6),
    getTenantsRiskAction(),
    getPlatformActivityAction(20),
  ])

  return (
    <SuperAdminDashboard
      tenants={tenants}
      execMetrics={execMetrics}
      trend={trend}
      risks={risks}
      activity={activity}
    />
  )
}
