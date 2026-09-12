'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { Upload, TrendingDown, Loader2, Plus } from 'lucide-react'
import { runMonthlyDepreciationAction } from '../fixedAssetActions'
import { toast } from 'sonner'

export function FixedAssetToolbar() {
    const router = useRouter()
    const [busy, setBusy] = useState(false)

    const run = async () => {
        if (!window.confirm('¿Correr la depreciación de este mes para todos los activos activos? (No se duplica si ya se corrió este mes.)')) return
        setBusy(true)
        const r = await runMonthlyDepreciationAction()
        setBusy(false)
        if (r.error) { toast.error(r.error); return }
        toast.success(
            `Depreciación aplicada: ${r.processed} activo(s) por $${Math.round(r.total ?? 0).toLocaleString('es-CO')}` +
            (r.skipped ? ` · ${r.skipped} omitidos` : '') +
            (r.errors ? ` · ${r.errors} con error` : '')
        )
        router.refresh()
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            <Button onClick={run} disabled={busy} variant="outline" size="sm" className="h-9 px-4 rounded-xl gap-2 border-slate-200 text-slate-600 hover:bg-slate-50">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingDown className="h-3.5 w-3.5" />}
                <span className="text-xs">Correr depreciación</span>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-9 px-4 rounded-xl gap-2 border-slate-200 text-slate-600 hover:bg-slate-50">
                <Link href="/accounting/fixed-assets/import"><Upload className="h-3.5 w-3.5" /><span className="text-xs">Importar</span></Link>
            </Button>
            <Button size="sm" asChild className="h-9 px-4 rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700">
                <Link href="/accounting/fixed-assets/new"><Plus className="h-3.5 w-3.5" /><span className="text-xs">Registrar Activo</span></Link>
            </Button>
        </div>
    )
}
