'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { BookOpen, Loader2, Download } from 'lucide-react'
import { manualService } from '../services/manualService'

interface Props {
    companyName: string
    logoUrl?: string | null
}

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

export function DownloadManualButton({ companyName, logoUrl }: Props) {
    const [loading, setLoading] = useState(false)

    const handleDownload = async () => {
        setLoading(true)
        try {
            const logo = await loadImageAsDataUrl(logoUrl)
            manualService.generatePayrollManual({ companyName, logoDataUrl: logo })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            onClick={handleDownload}
            disabled={loading}
            className="h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest gap-2 px-5"
        >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
            Manual de Usuario (PDF)
            {!loading && <Download className="h-4 w-4 opacity-70" />}
        </Button>
    )
}
