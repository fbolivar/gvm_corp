"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
    documentAttachmentService,
    type AttachmentDepartment,
    type DocumentAttachment,
} from "../services/documentAttachmentService"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import {
    Briefcase,
    Calculator,
    Upload,
    Loader2,
    FileText,
    FileImage,
    File,
    Trash2,
    Download,
    X,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Props {
    documentId: string
    tenantId: string
}

const DEPT_META: Record<AttachmentDepartment, { label: string; desc: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
    COMERCIAL: {
        label: "Adjuntos Dpto. Comercial",
        desc: "Recibos de caja menor, cotizaciones, soportes de venta",
        icon: Briefcase,
        color: "text-indigo-600",
        bg: "bg-indigo-50",
        border: "border-indigo-100",
    },
    CONTABLE: {
        label: "Adjuntos Dpto. Contable",
        desc: "Soportes contables, notas, documentos fiscales",
        icon: Calculator,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        border: "border-emerald-100",
    },
}

function formatBytes(bytes: number | null) {
    if (!bytes) return ""
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ mime }: { mime: string | null }) {
    if (!mime) return <File className="h-5 w-5" />
    if (mime.startsWith("image/")) return <FileImage className="h-5 w-5" />
    if (mime === "application/pdf") return <FileText className="h-5 w-5" />
    return <File className="h-5 w-5" />
}

interface PanelProps {
    department: AttachmentDepartment
    documentId: string
    tenantId: string
    uploaderName: string
    currentUserId: string | null
    attachments: DocumentAttachment[]
    onUploaded: (att: DocumentAttachment) => void
    onDeleted: (id: string) => void
}

function AttachmentPanel({ department, documentId, tenantId, uploaderName, currentUserId, attachments, onUploaded, onDeleted }: PanelProps) {
    const meta = DEPT_META[department]
    const Icon = meta.icon
    const fileRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return
        setUploading(true)
        for (const file of Array.from(files)) {
            try {
                const att = await documentAttachmentService.upload(
                    documentId, tenantId, department, file, uploaderName
                )
                onUploaded(att)
                toast.success(`"${file.name}" adjuntado en ${meta.label}`)
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Error al adjuntar archivo")
            }
        }
        setUploading(false)
        if (fileRef.current) fileRef.current.value = ""
    }

    const handleDelete = async (att: DocumentAttachment) => {
        setDeletingId(att.id)
        try {
            await documentAttachmentService.remove(att)
            onDeleted(att.id)
            toast.success(`"${att.file_name}" eliminado`)
        } catch {
            toast.error("No se pudo eliminar el archivo")
        } finally {
            setDeletingId(null)
        }
    }

    const panelAttachments = attachments.filter(a => a.department === department)

    return (
        <Card className={`border ${meta.border} bg-white shadow-sm rounded-[2rem] overflow-hidden`}>
            <CardHeader className="px-8 pt-7 pb-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl ${meta.bg} flex items-center justify-center ${meta.color}`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-black text-slate-900 tracking-tight">{meta.label}</CardTitle>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{meta.desc}</p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        disabled={uploading}
                        onClick={() => fileRef.current?.click()}
                        className={`h-9 px-4 rounded-xl ${meta.bg} ${meta.color} border ${meta.border} shadow-none font-black text-[10px] uppercase tracking-widest hover:opacity-80 transition`}
                    >
                        {uploading
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            : <Upload className="h-3.5 w-3.5 mr-1.5" />
                        }
                        {uploading ? "Subiendo..." : "Adjuntar"}
                    </Button>
                </div>
                <input
                    ref={fileRef}
                    type="file"
                    multiple
                    className="hidden"
                    aria-label={`Adjuntar archivos al departamento ${meta.label}`}
                    title={`Adjuntar archivos al departamento ${meta.label}`}
                    onChange={e => handleFiles(e.target.files)}
                    disabled={uploading}
                />
            </CardHeader>

            <CardContent className="px-8 pb-7">
                {panelAttachments.length === 0 ? (
                    <div
                        className={`rounded-2xl border-2 border-dashed ${meta.border} ${meta.bg} bg-opacity-40 p-8 flex flex-col items-center gap-3 cursor-pointer hover:opacity-80 transition`}
                        onClick={() => !uploading && fileRef.current?.click()}
                    >
                        <div className={`h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center ${meta.color}`}>
                            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                        </div>
                        <p className="text-xs font-bold text-slate-400 text-center">
                            {uploading ? "Subiendo archivo..." : "Haz clic para adjuntar archivos"}
                        </p>
                        <p className="text-[10px] text-slate-300">PDF, imágenes, Excel, Word · máx. 20 MB por archivo</p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {panelAttachments.map(att => (
                            <li key={att.id} className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3 group hover:bg-white hover:shadow-sm transition-all">
                                <div className={`h-9 w-9 rounded-xl ${meta.bg} flex items-center justify-center ${meta.color} shrink-0`}>
                                    <FileIcon mime={att.mime_type} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-slate-900 truncate">{att.file_name}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                        {formatBytes(att.file_size)}
                                        {att.created_by_name && ` · ${att.created_by_name}`}
                                        {att.created_at && ` · ${format(new Date(att.created_at), "d MMM yyyy", { locale: es })}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {att.signed_url && (
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            asChild
                                            className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                            title="Descargar"
                                        >
                                            <a href={att.signed_url} target="_blank" rel="noopener noreferrer" download={att.file_name}>
                                                <Download className="h-4 w-4" />
                                            </a>
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        disabled={deletingId === att.id}
                                        onClick={() => handleDelete(att)}
                                        className="h-8 w-8 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                        title="Eliminar"
                                    >
                                        {deletingId === att.id
                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                            : <Trash2 className="h-4 w-4" />
                                        }
                                    </Button>
                                </div>
                            </li>
                        ))}
                        {/* Añadir más archivos */}
                        <li>
                            <button
                                type="button"
                                disabled={uploading}
                                onClick={() => fileRef.current?.click()}
                                className={`w-full text-center text-[10px] font-black uppercase tracking-widest ${meta.color} py-2.5 rounded-2xl border-2 border-dashed ${meta.border} hover:opacity-70 transition disabled:opacity-40`}
                            >
                                {uploading ? <Loader2 className="inline h-3 w-3 animate-spin mr-1" /> : <X className="inline h-3 w-3 mr-1 rotate-45" />}
                                Agregar otro archivo
                            </button>
                        </li>
                    </ul>
                )}
            </CardContent>
        </Card>
    )
}

export function DocumentAttachmentsSection({ documentId, tenantId }: Props) {
    const [attachments, setAttachments] = useState<DocumentAttachment[]>([])
    const [loading, setLoading] = useState(true)
    const [uploaderName, setUploaderName] = useState("Usuario")
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    const load = useCallback(async () => {
        try {
            const data = await documentAttachmentService.list(documentId)
            setAttachments(data)
        } catch {
            // silencioso — tabla puede no existir aún en local
        } finally {
            setLoading(false)
        }
    }, [documentId])

    useEffect(() => {
        void load()
        void (async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            setCurrentUserId(user.id)
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .maybeSingle()
            if (profile?.full_name) setUploaderName(profile.full_name)
        })()
    }, [load])

    const handleUploaded = (att: DocumentAttachment) =>
        setAttachments(prev => [...prev, att])

    const handleDeleted = (id: string) =>
        setAttachments(prev => prev.filter(a => a.id !== id))

    if (loading) return null

    const sharedProps = { documentId, tenantId, uploaderName, currentUserId, attachments, onUploaded: handleUploaded, onDeleted: handleDeleted }

    return (
        <div className="space-y-3">
            <div className="px-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Adjuntos del Documento</p>
                <p className="text-xs text-slate-300 mt-0.5">Soporte documental por departamento · visible para todos los usuarios del pedido</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AttachmentPanel department="COMERCIAL" {...sharedProps} />
                <AttachmentPanel department="CONTABLE" {...sharedProps} />
            </div>
        </div>
    )
}
