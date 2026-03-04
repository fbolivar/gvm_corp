"use client"

import { useState } from "react"
import { Card } from "@/shared/components/ui/card"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Button } from "@/shared/components/ui/button"
import {
    Shield,
    Key,
    FileCode,
    Upload,
    Save,
    CheckCircle2,
    Lock,
    Settings2,
    Globe,
    Loader2
} from "lucide-react"
import { saveDianConfigAction } from "../actions"
import { toast } from "sonner"
import { cn } from "@/shared/lib/utils"

interface Props {
    initialConfig?: any
}

export function DianConfigForm({ initialConfig }: Props) {
    const [isLoading, setIsLoading] = useState(false)
    const [config, setConfig] = useState(() => {
        const defaults = {
            software_id: "",
            pin: "",
            technical_key: "",
            certificate_password: "",
            test_set_id_invoice: "",
            test_set_id_payroll: "",
            environment: "TEST"
        }
        if (!initialConfig) return defaults
        // Replace null values with empty strings to avoid React warnings
        const merged: Record<string, unknown> = { ...defaults }
        for (const key of Object.keys(defaults)) {
            merged[key] = initialConfig[key] ?? defaults[key as keyof typeof defaults]
        }
        return merged
    })
    const [certificateName, setCertificateName] = useState("")

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setCertificateName(file.name)
        const reader = new FileReader()
        reader.onload = async (event) => {
            // FileReader.readAsDataURL returns "data:<mime>;base64,<data>"
            // We strip the prefix so we store only the raw base64 bytes in the DB.
            const dataUrl = event.target?.result as string
            const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
            setConfig((prev: any) => ({ ...prev, certificate_b64: base64 }))
        }
        reader.readAsDataURL(file)
    }

    const handleSave = async () => {
        setIsLoading(true)
        try {
            const result = await saveDianConfigAction(config)
            if (result.error) throw new Error(result.error)

            toast.success("Configuración guardada correctamente")
        } catch (error: any) {
            toast.error("Error al guardar: " + error.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Software Configuration */}
                <Card className="p-8 bg-white border-none shadow-premium rounded-[2.5rem] space-y-6 group">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform duration-500">
                            <Settings2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight italic">Identificación de Software</h3>
                    </div>

                    <div className="space-y-5">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5">Software ID</Label>
                            <div className="relative group/field">
                                <FileCode className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <Input
                                    value={config.software_id}
                                    onChange={(e) => setConfig({ ...config, software_id: e.target.value })}
                                    placeholder="UUID de Software"
                                    className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 placeholder:text-slate-300"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5">PIN</Label>
                                <div className="relative group/field">
                                    <Key className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                    <Input
                                        type="password"
                                        value={config.pin}
                                        onChange={(e) => setConfig({ ...config, pin: e.target.value })}
                                        placeholder="12345"
                                        className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 placeholder:text-slate-300"
                                    />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5">Clave Técnica</Label>
                                <div className="relative group/field">
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                    <Input
                                        type="password"
                                        value={config.technical_key}
                                        onChange={(e) => setConfig({ ...config, technical_key: e.target.value })}
                                        placeholder="Clave DIAN"
                                        className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 placeholder:text-slate-300"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Certificate Configuration */}
                <Card className="p-8 bg-white border-none shadow-premium rounded-[2.5rem] space-y-6 group">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform duration-500">
                            <Shield className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight italic">Firma Digital (.p12)</h3>
                    </div>

                    <div className="space-y-5">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5">Archivo Certificado</Label>
                            <div className="relative">
                                <div className={cn(
                                    "flex items-center gap-3 w-full h-14 px-6 bg-slate-50 border-none rounded-2xl text-sm cursor-pointer hover:bg-slate-100 transition-all font-bold",
                                    certificateName ? "text-primary" : "text-slate-300"
                                )}>
                                    <Upload className="w-5 h-5 shrink-0" />
                                    <span className="truncate">{certificateName || "Seleccionar archivo .p12..."}</span>
                                    <input
                                        type="file"
                                        accept=".p12,.pfx"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5">Contraseña Certificado</Label>
                            <div className="relative group/field">
                                <Key className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <Input
                                    type="password"
                                    value={config.certificate_password}
                                    onChange={(e) => setConfig({ ...config, certificate_password: e.target.value })}
                                    placeholder="Password del .p12"
                                    className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 placeholder:text-slate-300"
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Environments & Test Sets */}
                <Card className="p-8 md:col-span-2 bg-white border-none shadow-premium rounded-[2.5rem] space-y-6 group">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 shadow-sm group-hover:scale-110 transition-transform duration-500">
                                <Globe className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight italic">Entornos y Habilitación</h3>
                        </div>

                        <div className="flex p-1.5 bg-slate-50 rounded-[1.5rem]">
                            <button
                                onClick={() => setConfig({ ...config, environment: "TEST" })}
                                className={cn(
                                    "px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                                    config.environment === "TEST" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-900"
                                )}
                            >
                                PRUEBAS
                            </button>
                            <button
                                onClick={() => setConfig({ ...config, environment: "PROD" })}
                                className={cn(
                                    "px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                                    config.environment === "PROD" ? "bg-rose-500 text-white shadow-lg" : "text-slate-400 hover:text-slate-900"
                                )}
                            >
                                PRODUCCIÓN
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5">Test Set ID (Facturación)</Label>
                            <Input
                                value={config.test_set_id_invoice}
                                onChange={(e) => setConfig({ ...config, test_set_id_invoice: e.target.value })}
                                placeholder="UUID del Test Set de Facturación"
                                className="h-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 placeholder:text-slate-300 px-6"
                            />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5">Test Set ID (Nómina)</Label>
                            <Input
                                value={config.test_set_id_payroll}
                                onChange={(e) => setConfig({ ...config, test_set_id_payroll: e.target.value })}
                                placeholder="UUID del Test Set de Nómina"
                                className="h-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 placeholder:text-slate-300 px-6"
                            />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="flex justify-end gap-4 pt-2">
                <Button
                    variant="ghost"
                    className="h-14 px-8 rounded-[1.5rem] font-black text-slate-400 hover:text-slate-900 text-xs uppercase tracking-widest"
                    disabled={isLoading}
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="h-14 px-12 rounded-[1.5rem] bg-slate-900 hover:bg-primary text-white font-black shadow-active transition-all hover:scale-105 active:scale-95 text-xs uppercase tracking-widest"
                >
                    {isLoading ? (
                        <div className="flex items-center gap-3">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>GUARDANDO...</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Save className="w-5 h-5" />
                            <span>GUARDAR CAMBIOS</span>
                        </div>
                    )}
                </Button>
            </div>
        </div>
    )
}
