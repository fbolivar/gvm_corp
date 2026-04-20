import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listAllAnnouncementsAction } from '@/features/super-admin/services/superAdminService'
import { AnnouncementsClient } from './AnnouncementsClient'

export const metadata = { title: 'Anuncios · Super Admin' }
export const dynamic = 'force-dynamic'

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: isAdmin } = await supabase.rpc('is_platform_admin')
  if (!isAdmin) redirect('/dashboard')

  const announcements = await listAllAnnouncementsAction()
  return <AnnouncementsClient initialAnnouncements={announcements} />
}
