'use client'

import { Button } from '@/shared/components/ui/button'
import { FileDown } from 'lucide-react'
import { commercialPdfService } from '../services/commercialPdfService'
import type { CommercialItemRow } from '../types'

interface Props {
    request: Record<string, any>
    items: CommercialItemRow[]
    tenant: {
        name?: string; nit?: string | null; dv?: string | null; address?: string | null;
        city?: string | null; department?: string | null; phone?: string | null; email?: string | null; logo_url?: string | null
    } | null
}

export function CommercialPdfButton({ request, items, tenant }: Props) {
    const company = {
        name: tenant?.name || 'GVM S.A.S',
        nit: tenant?.nit, dv: tenant?.dv, address: tenant?.address, city: tenant?.city,
        department: tenant?.department, phone: tenant?.phone, email: tenant?.email, logo_url: tenant?.logo_url,
    }
    return (
        <Button variant="outline" onClick={() => commercialPdfService.generate({ ...request, items }, company)}
            className="h-11 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-black text-[10px] uppercase tracking-widest gap-2">
            <FileDown className="h-4 w-4" /> Generar PDF
        </Button>
    )
}
