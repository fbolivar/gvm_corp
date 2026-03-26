'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { getLicense, getLicenseStatus, getDaysRemaining, type TenantLicense } from '@/features/settings/services/licenseService'

export function LicenseBanner() {
  const [license, setLicense] = useState<TenantLicense | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getLicense().then(l => { setLicense(l); setLoaded(true) })
  }, [])

  if (!loaded || dismissed) return null

  const status = getLicenseStatus(license)

  if (status === 'VALID') return null

  const days = license ? getDaysRemaining(license) : 0

  if (status === 'EXPIRING_SOON') {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-amber-800">
          <AlertTriangle className="w-4 h-4" />
          <span>Tu licencia vence en <strong>{days} días</strong>.</span>
          <Link href="/settings/license" className="underline font-medium">Ver licencia</Link>
        </div>
        <button onClick={() => setDismissed(true)} className="text-amber-600 hover:text-amber-800">✕</button>
      </div>
    )
  }

  if (status === 'EXPIRED' || status === 'SUSPENDED') {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-red-800">
          <XCircle className="w-4 h-4" />
          <span><strong>Licencia {status === 'EXPIRED' ? 'expirada' : 'suspendida'}.</strong> Contacta a soporte para renovar.</span>
          <Link href="/settings/license" className="underline font-medium">Ver licencia</Link>
        </div>
      </div>
    )
  }

  if (status === 'NOT_FOUND') {
    return (
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <AlertTriangle className="w-4 h-4" />
          <span>No se encontró licencia activa.</span>
          <Link href="/settings/license" className="underline font-medium">Configurar licencia</Link>
        </div>
      </div>
    )
  }

  return null
}
