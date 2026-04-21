"use client"

import { useEffect, useRef, useState } from "react"
import type { UseFormReturn } from "react-hook-form"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { SearchableSelect } from "@/shared/components/ui/searchable-select"
import { FormSection, FormField } from "@/shared/components/ui/form-layout"
import { FileText, Upload, Loader2, ShieldCheck, X, FileImage, FileType } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

interface CommercialOption {
  user_id: string
  full_name: string
  signature_url: string | null
  commercial_code: string | null
}

interface Props {
  form: UseFormReturn<any>
  tenantId: string
  commercials: CommercialOption[]
}

const DOCTOR_TYPE_OPTIONS = [
  { value: "VETERINARIO", label: "Médico Veterinario" },
  { value: "ZOOTECNISTA", label: "Zootecnista" },
]

export function IcaPrescriptionSection({ form, tenantId, commercials }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()

  const prescriptionUrl: string | null = form.watch("prescription_url")
  const commercialUserId: string | null = form.watch("commercial_user_id")
  const selectedCommercial = commercials.find(c => c.user_id === commercialUserId)

  // Auto-seleccionar el usuario actual como comercial al montar (si no hay uno ya)
  useEffect(() => {
    if (commercialUserId) return
    void (async () => {
      const { data } = await supabase.auth.getUser()
      const userId = data.user?.id
      const me = commercials.find(c => c.user_id === userId)
      if (me) form.setValue("commercial_user_id", me.user_id, { shouldDirty: false })
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFileUpload = async (file: File) => {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La receta no puede superar 10 MB")
      return
    }
    if (!["image/png", "image/jpeg", "image/webp", "application/pdf"].includes(file.type)) {
      toast.error("Solo se aceptan PDF, PNG, JPG o WEBP")
      return
    }
    setUploading(true)
    try {
      const ext = file.name.split(".").pop() || "bin"
      const path = `${tenantId}/prescriptions/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from("documents")
        .upload(path, file, { upsert: false, contentType: file.type })
      if (uploadErr) throw uploadErr
      const { data: signed } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 60 * 24 * 365 * 5)
      const url = signed?.signedUrl || path
      form.setValue("prescription_url", url, { shouldDirty: true })
      toast.success("Receta cargada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error subiendo archivo")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const removePrescription = () => {
    form.setValue("prescription_url", null, { shouldDirty: true })
  }

  const isPdf = prescriptionUrl?.toLowerCase().includes(".pdf")

  return (
    <FormSection
      title="Receta médica ICA"
      description="Resolución ICA: receta firmada por médico veterinario o zootecnista (obligatoria para medicamentos veterinarios)"
    >
      <div className="space-y-4">
        {/* Indicador de cumplimiento */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
          prescriptionUrl ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-800 border border-amber-100"
        }`}>
          <ShieldCheck className="h-4 w-4" />
          {prescriptionUrl ? "Receta cargada — pedido cumple ICA" : "Falta receta firmada para cumplir requisito ICA"}
        </div>

        {/* Upload o preview */}
        {!prescriptionUrl ? (
          <div className="surface-card p-6 text-center border-dashed border-2 border-slate-200 hover:border-slate-300 transition">
            <input
              ref={fileInputRef}
              type="file"
              aria-label="Subir receta médica firmada"
              title="Subir receta médica firmada"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              disabled={uploading}
            />
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 mb-1">Subir receta médica firmada</p>
                <p className="text-xs text-slate-500">PDF, PNG, JPG o WEBP · máx. 10 MB</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Subiendo..." : "Seleccionar archivo"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="surface-card p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              {isPdf ? <FileType className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">Receta cargada</p>
              <a href={prescriptionUrl} target="_blank" rel="noopener" className="text-xs text-blue-600 hover:underline truncate block">
                Ver archivo
              </a>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={removePrescription}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Datos del médico */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Tipo de profesional" required>
            <SearchableSelect
              items={DOCTOR_TYPE_OPTIONS}
              value={form.watch("prescription_doctor_type") || ""}
              onChange={v => form.setValue("prescription_doctor_type", v as 'VETERINARIO' | 'ZOOTECNISTA', { shouldDirty: true })}
              placeholder="Seleccionar..."
            />
          </FormField>
          <FormField label="Fecha de la receta" required>
            <Input
              type="date"
              {...form.register("prescription_date")}
            />
          </FormField>
          <FormField label="Nombre del profesional" required>
            <Input
              placeholder="Ej: Dr. Juan Pérez"
              {...form.register("prescription_doctor_name")}
            />
          </FormField>
          <FormField label="Matrícula profesional" required>
            <Input
              placeholder="Ej: COMVEZCOL 12345"
              {...form.register("prescription_doctor_license")}
            />
          </FormField>
        </div>

        {/* Comercial responsable + firma */}
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">Comercial responsable</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <FormField label="Nombre del comercial" required>
              <SearchableSelect
                items={commercials.map(c => ({
                  value: c.user_id,
                  label: c.full_name,
                  subLabel: c.commercial_code || undefined,
                  keywords: `${c.commercial_code ?? ''} ${c.full_name}`,
                }))}
                value={commercialUserId || ""}
                onChange={v => form.setValue("commercial_user_id", v, { shouldDirty: true })}
                placeholder="Seleccionar comercial..."
              />
            </FormField>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Firma digital</label>
              {selectedCommercial?.signature_url ? (
                <div className="surface-card p-3 flex items-center gap-3">
                  <div className="relative h-12 w-24 bg-white border border-slate-200 rounded">
                    <Image
                      src={selectedCommercial.signature_url}
                      alt={`Firma de ${selectedCommercial.full_name}`}
                      fill
                      className="object-contain p-1"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-600">Firma cargada</p>
                    <p className="text-xs font-medium text-slate-900 truncate">{selectedCommercial.full_name}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/40 p-3">
                  <p className="text-xs text-amber-800">
                    {commercialUserId
                      ? "Este comercial aún no tiene firma cargada. Puede subirla en /settings/profile"
                      : "Selecciona un comercial para ver su firma"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </FormSection>
  )
}
