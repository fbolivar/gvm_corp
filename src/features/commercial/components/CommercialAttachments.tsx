'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Paperclip, Loader2, Trash2, FileText, Download, Upload } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { uploadCommercialAttachmentAction, deleteCommercialAttachmentAction } from '../actions'

export interface AttachmentFile {
    name: string
    path: string
    kind: string
    size: number
    uploaded_at: string
    url: string | null
}

interface Props {
    requestId: string
    files: AttachmentFile[]
    canEdit: boolean
}

const KINDS = ['Cotización', 'Factura', 'Invitación', 'Soporte']

function fmtSize(n: number) {
    if (!n) return ''
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
    return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function CommercialAttachments({ requestId, files, canEdit }: Props) {
    const router = useRouter()
    const fileRef = useRef<HTMLInputElement>(null)
    const [kind, setKind] = useState('Cotización')
    const [uploading, setUploading] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)

    async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        const fd = new FormData()
        fd.append('file', file)
        fd.append('kind', kind)
        const res = await uploadCommercialAttachmentAction(requestId, fd)
        setUploading(false)
        if (fileRef.current) fileRef.current.value = ''
        if (res.error) { toast.error(res.error); return }
        toast.success('Archivo adjuntado')
        router.refresh()
    }

    async function onDelete(path: string) {
        setDeleting(path)
        const res = await deleteCommercialAttachmentAction(requestId, path)
        setDeleting(null)
        if (res.error) { toast.error(res.error); return }
        toast.success('Archivo eliminado')
        router.refresh()
    }

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Paperclip className="h-3.5 w-3.5" /> Adjuntos ({files.length})
                </h3>
                {canEdit && (
                    <div className="flex items-center gap-2">
                        <select value={kind} onChange={(e) => setKind(e.target.value)}
                            className="h-9 rounded-xl border border-slate-200 bg-slate-50/60 text-[11px] font-bold px-2 outline-none">
                            {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                        </select>
                        <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={onFile} className="hidden" id="commercial-file" />
                        <Button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}
                            className="h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest gap-1.5">
                            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Subir
                        </Button>
                    </div>
                )}
            </div>

            {files.length === 0 ? (
                <p className="text-xs text-slate-400">Sin archivos adjuntos. Sube cotizaciones al pedir y facturas al liquidar.</p>
            ) : (
                <div className="space-y-2">
                    {files.map((f) => (
                        <div key={f.path} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/40 px-4 py-3">
                            <div className="h-9 w-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-indigo-500 shrink-0">
                                <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-900 truncate">{f.name}</p>
                                <p className="text-[10px] text-slate-400">
                                    <span className="font-semibold uppercase tracking-wide text-indigo-500">{f.kind}</span>
                                    {f.size ? ` · ${fmtSize(f.size)}` : ''}
                                </p>
                            </div>
                            {f.url && (
                                <a href={f.url} target="_blank" rel="noopener noreferrer"
                                    className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shrink-0">
                                    <Download className="h-3.5 w-3.5" />
                                </a>
                            )}
                            {canEdit && (
                                <button type="button" onClick={() => onDelete(f.path)} disabled={deleting === f.path}
                                    className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-400 hover:text-rose-600 flex items-center justify-center transition-all shrink-0 disabled:opacity-40">
                                    {deleting === f.path ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
