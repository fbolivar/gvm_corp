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
                className="h-20 w-full rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black italic tracking-tight text-xl shadow-active hover:scale-[1.02] transition-all group flex items-center justify-between px-10 border-none"
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
                className="h-20 w-full rounded-[2rem] bg-white border-2 border-slate-100 text-slate-900 font-black italic tracking-tight text-xl hover:bg-slate-50 transition-all flex items-center justify-between px-10"
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
