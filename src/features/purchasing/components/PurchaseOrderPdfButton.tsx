'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { purchaseOrderPdfService } from '../services/purchaseOrderPdfService'

interface Props {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    order: Record<string, any>
    tenant: {
        name?: string; nit?: string | null; dv?: string | null; address?: string | null;
        city?: string | null; department?: string | null; phone?: string | null; email?: string | null; logo_url?: string | null
    } | null
}

export function PurchaseOrderPdfButton({ order, tenant }: Props) {
    const [loading, setLoading] = useState(false)

    const company = {
        name: tenant?.name || 'GVM S.A.S',
        nit: tenant?.nit, dv: tenant?.dv, address: tenant?.address, city: tenant?.city,
        department: tenant?.department, phone: tenant?.phone, email: tenant?.email, logo_url: tenant?.logo_url,
    }

    async function handleClick() {
        setLoading(true)
        try {
            await purchaseOrderPdfService.generate(order, company)
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={loading}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
        >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            Descargar PDF
        </button>
    )
}
