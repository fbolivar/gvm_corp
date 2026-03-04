'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { certificateService, type CertificateData } from '../services/certificateService'

interface Props {
    data: CertificateData
}

export function CertificateButtons({ data }: Props) {
    const [loadingLaboral,  setLoadingLaboral]  = useState(false)
    const [loadingIngresos, setLoadingIngresos] = useState(false)

    const handleLaboral = async () => {
        setLoadingLaboral(true)
        try {
            certificateService.generateLaboralCertificate(data)
        } finally {
            setLoadingLaboral(false)
        }
    }

    const handleIngresos = async () => {
        setLoadingIngresos(true)
        try {
            certificateService.generateIncomeCertificate(data)
        } finally {
            setLoadingIngresos(false)
        }
    }

    return (
        <div className="grid gap-4">
            <Button
                onClick={handleLaboral}
                disabled={loadingLaboral || loadingIngresos}
                className="h-11 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold tracking-tight text-sm transition-all group flex items-center justify-between px-5 border-none"
            >
                CERTIFICADO LABORAL
                {loadingLaboral
                    ? <Loader2 className="h-6 w-6 animate-spin" />
                    : <Download className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                }
            </Button>
            <Button
                variant="outline"
                onClick={handleIngresos}
                disabled={loadingLaboral || loadingIngresos}
                className="h-11 w-full rounded-xl bg-white border border-slate-200 text-slate-900 font-bold tracking-tight text-sm hover:bg-slate-50 transition-all flex items-center justify-between px-5"
            >
                CERTIFICADO INGRESOS
                {loadingIngresos
                    ? <Loader2 className="h-6 w-6 animate-spin" />
                    : <Download className="h-6 w-6 opacity-30 group-hover:opacity-100 transition-opacity" />
                }
            </Button>
        </div>
    )
}
