'use client'

import { useMemo, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Button } from '@/shared/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { certificateService, type CertificateData } from '../services/certificateService'

interface Props {
    data: CertificateData
}

/** Carga una imagen (URL) como dataURL base64, o null si falla. */
async function loadImageAsDataUrl(url?: string | null): Promise<string | null> {
    if (!url) return null
    try {
        const res = await fetch(url, { cache: 'force-cache' })
        if (!res.ok) return null
        const blob = await res.blob()
        return await new Promise<string>((resolve, reject) => {
            const r = new FileReader()
            r.onloadend = () => resolve(r.result as string)
            r.onerror = reject
            r.readAsDataURL(blob)
        })
    } catch {
        return null
    }
}

/** Código de verificación determinístico a partir de los datos del certificado. */
function verificationCode(data: CertificateData, today: string): string {
    const base = `${data.companyNit ?? ''}|${data.employeeDoc}|${data.startDate}|${today}`
    let h = 0
    for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0
    return 'GVM-' + h.toString(36).toUpperCase().padStart(8, '0').slice(0, 8)
}

export function CertificateButtons({ data }: Props) {
    const [loadingLaboral, setLoadingLaboral] = useState(false)
    const [loadingIngresos, setLoadingIngresos] = useState(false)
    const qrWrapRef = useRef<HTMLDivElement>(null)

    const today = data.today ?? new Date().toISOString().split('T')[0]
    const code = useMemo(() => verificationCode(data, today), [data, today])
    const qrValue = `CERTIFICADO · ${data.companyName}\n`
        + `Empleado: ${data.employeeName}\n`
        + `Doc: ${data.employeeDocType || 'C.C.'} ${data.employeeDoc}\n`
        + `Expedido: ${today}\nCódigo: ${code}`

    const build = async (kind: 'laboral' | 'ingresos') => {
        const setLoading = kind === 'laboral' ? setLoadingLaboral : setLoadingIngresos
        setLoading(true)
        try {
            const [logo, sig] = await Promise.all([
                loadImageAsDataUrl(data.companyLogoUrl),
                loadImageAsDataUrl(data.signerSignatureUrl),
            ])
            const qrCanvas = qrWrapRef.current?.querySelector('canvas') as HTMLCanvasElement | null
            const qrDataUrl = qrCanvas ? qrCanvas.toDataURL('image/png') : null

            const full: CertificateData = {
                ...data,
                today,
                verificationCode: code,
                companyLogoDataUrl: logo,
                signatureDataUrl: sig,
                qrDataUrl,
            }
            if (kind === 'laboral') certificateService.generateLaboralCertificate(full)
            else certificateService.generateIncomeCertificate(full)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid gap-4">
            {/* QR oculto — se lee su canvas al generar el PDF */}
            <div className="hidden" aria-hidden>
                <div ref={qrWrapRef}>
                    <QRCodeCanvas value={qrValue} size={160} level="M" marginSize={2} />
                </div>
            </div>

            <Button
                onClick={() => build('laboral')}
                disabled={loadingLaboral || loadingIngresos}
                className="h-11 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold tracking-tight text-sm transition-all group flex items-center justify-between px-5 border-none"
            >
                CERTIFICADO LABORAL
                {loadingLaboral
                    ? <Loader2 className="h-6 w-6 animate-spin" />
                    : <Download className="h-6 w-6 group-hover:translate-x-1 transition-transform" />}
            </Button>
            <Button
                variant="outline"
                onClick={() => build('ingresos')}
                disabled={loadingLaboral || loadingIngresos}
                className="h-11 w-full rounded-xl bg-white border border-slate-200 text-slate-900 font-bold tracking-tight text-sm hover:bg-slate-50 transition-all flex items-center justify-between px-5 group"
            >
                CERTIFICADO INGRESOS
                {loadingIngresos
                    ? <Loader2 className="h-6 w-6 animate-spin" />
                    : <Download className="h-6 w-6 opacity-30 group-hover:opacity-100 transition-opacity" />}
            </Button>
        </div>
    )
}
