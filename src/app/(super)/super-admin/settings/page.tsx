import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPlatformConfigAction } from '@/features/super-admin/services/superAdminService'
import { PlatformSettingsClient } from './PlatformSettingsClient'

export const metadata = {
  title: 'Configuración · BC Fabric Super Admin',
}

export default async function PlatformSettingsPage() {
  const supabase = await createClient()
  const { data: isAdmin } = await supabase.rpc('is_platform_admin')
  if (!isAdmin) redirect('/super-admin')

  const config = await getPlatformConfigAction()

  return <PlatformSettingsClient config={config} />
}
