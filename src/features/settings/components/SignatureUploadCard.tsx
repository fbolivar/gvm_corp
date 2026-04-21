"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { PenTool, Upload, Loader2, Trash2, Save } from "lucide-react"

interface Props {
  userId: string
  initialSignatureUrl: string | null
  initialCommercialCode: string | null
}

export function SignatureUploadCard({ userId, initialSignatureUrl, initialCommercialCode }: Props) {
  const [signatureUrl, setSignatureUrl] = useState<string | null>(initialSignatureUrl)
  const [commercialCode, setCommercialCode] = useState<string>(initialCommercialCode || "")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La firma no puede superar 2 MB")
      return
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Solo PNG, JPG o WEBP")
      return
    }
    setUploading(true)
    try {
      const ext = file.name.split(".").pop() || "png"
      const path = `signatures/${userId}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: signed } = await supabase.storage
        .from("documents")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5)
      const url = signed?.signedUrl || path

      const { error: updErr } = await supabase
        .from("profiles")
        .update({ signature_url: url })
        .eq("id", userId)
      if (updErr) throw updErr

      setSignatureUrl(url)
      toast.success("Firma cargada y guardada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error subiendo firma")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const handleSaveCode = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ commercial_code: commercialCode || null })
        .eq("id", userId)
      if (error) throw error
      toast.success("Código guardado")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error guardando")
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!confirm("¿Eliminar la firma actual?")) return
    setUploading(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ signature_url: null })
        .eq("id", userId)
      if (error) throw error
      setSignatureUrl(null)
      toast.success("Firma eliminada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error eliminando firma")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenTool className="h-5 w-5 text-slate-600" />
          Firma digital comercial
        </CardTitle>
        <p className="text-sm text-slate-500">
          Sube una imagen de tu firma. Se mostrará en los pedidos de venta que crees (cumplimiento ICA).
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Vista actual */}
        <div>
          <Label className="mb-2 block">Firma actual</Label>
          {signatureUrl ? (
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-48 bg-white border border-slate-200 rounded-lg p-2">
                <Image
                  src={signatureUrl}
                  alt="Tu firma digital"
                  fill
                  className="object-contain p-1"
                  unoptimized
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleRemove} disabled={uploading}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Aún no tienes firma cargada
            </div>
          )}
        </div>

        {/* Subir */}
        <div>
          <Label className="mb-2 block">Subir nueva firma (PNG, JPG, WEBP — máx 2MB)</Label>
          <input
            ref={fileRef}
            type="file"
            aria-label="Subir firma digital"
            title="Subir firma digital"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
            disabled={uploading}
          />
          <Button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {uploading ? "Subiendo..." : "Seleccionar imagen"}
          </Button>
          <p className="text-xs text-slate-500 mt-2">
            Tip: usa una imagen con fondo transparente para mejor resultado en los documentos impresos.
          </p>
        </div>

        {/* Código comercial */}
        <div className="border-t pt-6">
          <Label htmlFor="commercial_code" className="mb-2 block">Código de vendedor (opcional)</Label>
          <div className="flex gap-2">
            <Input
              id="commercial_code"
              value={commercialCode}
              onChange={e => setCommercialCode(e.target.value)}
              placeholder="Ej: V-01, COM-MAR, etc."
              maxLength={50}
            />
            <Button type="button" onClick={handleSaveCode} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
