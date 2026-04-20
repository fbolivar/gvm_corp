import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBroadcastRecipientsAction } from '@/features/super-admin/services/superAdminService'
import { BroadcastClient } from './BroadcastClient'

export const metadata = { title: 'Comunicados · Super Admin' }
export const dynamic = 'force-dynamic'

export default async function BroadcastPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: isAdmin } = await supabase.rpc('is_platform_admin')
  if (!isAdmin) redirect('/dashboard')

  const recipients = await getBroadcastRecipientsAction()
  return <BroadcastClient initialRecipients={recipients} />
}
