'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Paperclip, Loader2, Trash2, FileText, Download, Upload, Camera, ImageIcon } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { uploadCommercialAttachmentAction, deleteCommercialAttachmentAction } from '../actions'
import { compressImage, photoFileName } from '@/shared/lib/imageCompress'

/**
 * Soportes de una solicitud comercial (viáticos): cotizaciones al pedir,
 * recibos y comprobantes al liquidar.
 *
 * Dos formas de adjuntar: subir un archivo (imagen o PDF, varios a la vez) o
 * tomar la foto del recibo con la cámara del celular. Las fotos se comprimen
 * en el navegador antes de enviarse.
 */

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

const KINDS = ['Recibo', 'Factura', 'Comprobante de pago', 'Tiquete', 'Cotización', 'Invitación', 'Soporte']

function fmtSize(n: number) {
    if (!n) return ''
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
    return `${(n / 1024 / 1024).toFixed(1)} MB`
}

const isImage = (f: AttachmentFile) => /\.(jpe?g|png|webp|gif|heic)$/i.test(f.name)

export function CommercialAttachments({ requestId, files, canEdit }: Props) {
    const router = useRouter()
    const fileRef = useRef<HTMLInputElement>(null)
    const cameraRef = useRef<HTMLInputElement>(null)
    const [kind, setKind] = useState('Recibo')
    const [uploading, setUploading] = useState<string | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)

    /** Sube uno o varios archivos en secuencia, comprimiendo las imágenes. */
    async function uploadFiles(list: FileList | null, fromCamera: boolean) {
        const picked = Array.from(list ?? [])
        if (picked.length === 0) return

        let ok = 0
        for (const original of picked) {
            setUploading(original.name)
            try {
                let file = await compressImage(original)
                // La cámara entrega "image.jpg": un nombre con tipo y hora dice más.
                if (fromCamera && file.type.startsWith('image/')) {
                    file = new File([file], photoFileName(kind), { type: file.type })
                }
                const fd = new FormData()
                fd.append('file', file)
                fd.append('kind', kind)
                const res = await uploadCommercialAttachmentAction(requestId, fd)
                if (res.error) { toast.error(`${original.name}: ${res.error}`); continue }
                ok++
            } catch {
                toast.error(`${original.name}: no se pudo subir`)
            }
        }
        setUploading(null)
        if (fileRef.current) fileRef.current.value = ''
        if (cameraRef.current) cameraRef.current.value = ''
        if (ok > 0) {
            toast.success(ok === 1 ? 'Soporte adjuntado' : `${ok} soportes adjuntados`)
            router.refresh()
        }
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
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Paperclip className="h-3.5 w-3.5" /> Soportes ({files.length})
                </h3>

                {canEdit && (
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={kind}
                            onChange={(e) => setKind(e.target.value)}
                            aria-label="Tipo de soporte"
                            className="h-11 rounded-xl border border-slate-200 bg-slate-50/60 text-[11px] font-bold px-3 outline-none"
                        >
                            {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                        </select>

                        {/* Cámara: en el celular abre directamente la cámara trasera. */}
                        <input
                            ref={cameraRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => uploadFiles(e.target.files, true)}
                            className="hidden"
                        />
                        <Button
                            type="button"
                            disabled={!!uploading}
                            onClick={() => cameraRef.current?.click()}
                            className="h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest gap-1.5"
                        >
                            <Camera className="h-3.5 w-3.5" /> Tomar foto
                        </Button>

                        {/* Archivo desde el equipo o la galería; admite varios. */}
                        <input
                            ref={fileRef}
                            type="file"
                            multiple
                            accept="image/*,application/pdf"
                            onChange={(e) => uploadFiles(e.target.files, false)}
                            className="hidden"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            disabled={!!uploading}
                            onClick={() => fileRef.current?.click()}
                            className="h-11 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest gap-1.5"
                        >
                            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                            Subir archivo
                        </Button>
                    </div>
                )}
            </div>

            {uploading && (
                <p className="text-[11px] text-slate-500 flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Subiendo {uploading}…
                </p>
            )}

            {files.length === 0 ? (
                <p className="text-xs text-slate-400">
                    Sin soportes. Toma la foto del recibo o comprobante desde el celular, o sube el archivo.
                </p>
            ) : (
                <div className="space-y-2">
                    {files.map((f) => (
                        <div key={f.path} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/40 px-4 py-3">
                            {isImage(f) && f.url ? (
                                <a href={f.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                    <img
                                        src={f.url}
                                        alt={f.name}
                                        className="h-12 w-12 rounded-xl object-cover border border-slate-200 bg-white"
                                    />
                                </a>
                            ) : (
                                <div className="h-12 w-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-indigo-500 shrink-0">
                                    {isImage(f) ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-900 truncate">{f.name}</p>
                                <p className="text-[10px] text-slate-400">
                                    <span className="font-semibold uppercase tracking-wide text-indigo-500">{f.kind}</span>
                                    {f.size ? ` · ${fmtSize(f.size)}` : ''}
                                    {f.uploaded_at ? ` · ${new Date(f.uploaded_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', timeZone: 'America/Bogota' })}` : ''}
                                </p>
                            </div>
                            {f.url && (
                                <a href={f.url} target="_blank" rel="noopener noreferrer" aria-label="Abrir"
                                    className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shrink-0">
                                    <Download className="h-3.5 w-3.5" />
                                </a>
                            )}
                            {canEdit && (
                                <button type="button" onClick={() => onDelete(f.path)} disabled={deleting === f.path} aria-label="Eliminar"
                                    className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-400 hover:text-rose-600 flex items-center justify-center transition-all shrink-0 disabled:opacity-40">
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
