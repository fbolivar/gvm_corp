"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { toast } from "sonner"
import { uploadHrSignatureAction, removeHrSignatureAction, saveHrSignerAction } from "../actions/hrSignerActions"
import { PenTool, Upload, Loader2, Trash2, Save } from "lucide-react"

interface Props {
    /** Se conserva por compatibilidad con la página; el tenant lo resuelve el servidor. */
    tenantId: string
    initialName: string | null
    initialTitle: string | null
    initialSignatureUrl: string | null
}

/** Lee el archivo tal cual (sin recomprimir: conserva la transparencia del PNG). */
function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error("No se pudo leer el archivo"))
        reader.readAsDataURL(file)
    })
}

export function HrSignerCard({ initialName, initialTitle, initialSignatureUrl }: Props) {
    const [name, setName] = useState(initialName || "")
    const [title, setTitle] = useState(initialTitle || "Jefe de Recursos Humanos")
    const [signatureUrl, setSignatureUrl] = useState<string | null>(initialSignatureUrl)
    const [uploading, setUploading] = useState(false)
    const [saving, setSaving] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    const handleUpload = async (file: File) => {
        if (file.size > 2 * 1024 * 1024) { toast.error("La firma no puede superar 2 MB"); return }
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { toast.error("Solo PNG, JPG o WEBP"); return }
        setUploading(true)
        try {
            // La subida va por el servidor: el bucket no admite escritura directa
            // en hr-signatures desde el navegador (RLS de Storage).
            const dataUrl = await fileToDataUrl(file)
            const res = await uploadHrSignatureAction(dataUrl)
            if (!res.ok) { toast.error(res.error); return }
            if (res.url) setSignatureUrl(res.url)
            toast.success("Firma cargada y guardada")
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error subiendo firma")
        } finally {
            setUploading(false)
            if (fileRef.current) fileRef.current.value = ""
        }
    }

    const handleRemove = async () => {
        setUploading(true)
        try {
            const res = await removeHrSignatureAction()
            if (!res.ok) { toast.error(res.error); return }
            setSignatureUrl(null)
            toast.success("Firma eliminada")
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error eliminando firma")
        } finally {
            setUploading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await saveHrSignerAction(name, title)
            if (!res.ok) { toast.error(res.error); return }
            toast.success("Firmante de certificados actualizado")
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error guardando")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Card className="mt-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PenTool className="h-5 w-5 text-slate-600" />
                    Firmante de certificados laborales
                </CardTitle>
                <p className="text-sm text-slate-500">
                    Datos y firma del responsable de RRHH que aparecen en los certificados laborales y de ingresos.
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="hr_name" className="mb-2 block">Nombre del responsable</Label>
                        <Input id="hr_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. María Gómez" />
                    </div>
                    <div>
                        <Label htmlFor="hr_title" className="mb-2 block">Cargo</Label>
                        <Input id="hr_title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Jefe de Recursos Humanos" />
                    </div>
                </div>

                <div>
                    <Label className="mb-2 block">Firma actual</Label>
                    {signatureUrl ? (
                        <div className="flex items-center gap-4">
                            <div className="relative h-20 w-48 bg-white border border-slate-200 rounded-lg p-2">
                                <Image src={signatureUrl} alt="Firma RRHH" fill className="object-contain p-1" unoptimized />
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={handleRemove} disabled={uploading}>
                                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                            Aún no hay firma cargada — el certificado mostrará solo la línea de firma.
                        </div>
                    )}
                </div>

                <div>
                    <Label className="mb-2 block">Subir firma (PNG con fondo transparente recomendado, máx 2MB)</Label>
                    <input
                        ref={fileRef}
                        type="file"
                        aria-label="Subir firma RRHH"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                        disabled={uploading}
                    />
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                            {uploading ? "Subiendo..." : "Seleccionar imagen"}
                        </Button>
                        <Button type="button" onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Guardar datos
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
