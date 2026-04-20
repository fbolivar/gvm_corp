import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPlatformReportAction } from '@/features/super-admin/services/superAdminService'
import { ReportsClient } from './ReportsClient'

export const metadata = {
  title: 'Reportes · Super Admin',
}

export const dynamic = 'force-dynamic'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; plan?: string; status?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: isAdmin } = await supabase.rpc('is_platform_admin')
  if (!isAdmin) redirect('/dashboard')

  const sp = await searchParams

  // Defaults: últimos 30 días
  const today = new Date()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(today.getDate() - 30)

  const from = sp.from || thirtyDaysAgo.toISOString().slice(0, 10)
  const to = sp.to || today.toISOString().slice(0, 10)
  const plan = sp.plan || null
  const status = sp.status || null

  const report = await getPlatformReportAction(from, to, plan, status)

  return (
    <ReportsClient
      initialReport={report}
      initialFrom={from}
      initialTo={to}
      initialPlan={plan}
      initialStatus={status}
    />
  )
}
