import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTenantDetailAction } from '@/features/super-admin/services/superAdminService'
import { TenantDetailClient } from './TenantDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  return {
    title: `Detalle Tenant · Super Admin`,
    description: `Gestión de tenant ${id}`,
  }
}

export default async function TenantDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: isAdmin } = await supabase.rpc('is_platform_admin')
  if (!isAdmin) redirect('/dashboard')

  const detail = await getTenantDetailAction(id)

  if (!detail) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="bg-white border-2 border-red-200 rounded-2xl p-10 text-center max-w-sm">
          <div className="text-5xl mb-4">404</div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Tenant no encontrado</h2>
          <p className="text-sm text-slate-500 mb-6">
            El tenant con ID <code className="font-mono bg-slate-100 px-1 rounded">{id}</code> no existe.
          </p>
          <a
            href="/super-admin"
            className="inline-block px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-sm font-bold rounded-xl"
          >
            Volver al panel
          </a>
        </div>
      </div>
    )
  }

  return <TenantDetailClient detail={detail} />
}
