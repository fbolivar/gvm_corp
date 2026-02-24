"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { toast } from "sonner";
import { Building2, Save, Fingerprint, Globe, MapPin, Phone, Mail, ExternalLink, Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/shared/components/ui/badge";
import { settingsService, TenantInfo } from "../services/settingsService";

const tenantSchema = z.object({
    name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
    nit: z.string().min(5, "NIT inválido"),
    dv: z.string().length(1, "DV debe ser un dígito"),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
    city: z.string().optional().or(z.literal("")),
    department: z.string().optional().or(z.literal("")),
    country: z.string().optional().or(z.literal("")),
    website: z.string().optional().or(z.literal(""))
});

type TenantFormValues = z.infer<typeof tenantSchema>;

interface Props {
    initialData: TenantInfo | null;
}

export function TenantSettingsForm({ initialData }: Props) {
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const form = useForm<TenantFormValues>({
        resolver: zodResolver(tenantSchema),
        defaultValues: {
            name: initialData?.name || "",
            nit: initialData?.nit || "",
            dv: initialData?.dv || "",
            email: initialData?.email || "",
            phone: initialData?.phone || "",
            address: initialData?.address || "",
            city: initialData?.city || "",
            department: initialData?.department || "",
            country: initialData?.country || "Colombia",
            website: initialData?.website || ""
        }
    });

    async function onSubmit(data: TenantFormValues) {
        if (!initialData?.id) return;
        setLoading(true);
        try {
            await settingsService.updateTenantInfo(supabase, initialData.id, data);
            toast.success("Datos de empresa actualizados correctamente");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Error desconocido";
            toast.error("Error al actualizar: " + message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0 pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 italic leading-none">Datos de Empresa</h2>
                    <p className="text-slate-400 font-bold text-[10px] md:text-xs uppercase tracking-widest mt-1">Configuración Legal, Contacto y Ubicación</p>
                </div>
                <Button
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={loading}
                    className="w-full sm:w-auto h-12 md:h-14 px-10 rounded-2xl bg-slate-900 hover:bg-primary text-white font-black shadow-active transition-all active:scale-95 group"
                >
                    {loading ? "Guardando..." : (
                        <span className="flex items-center justify-center gap-3">
                            <Save className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                            GUARDAR CAMBIOS
                        </span>
                    )}
                </Button>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                {/* Identidad Corporativa (Logo) */}
                <Card className="border-none bg-slate-900 shadow-active rounded-[2.5rem] overflow-hidden md:col-span-2 relative group">
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                        <Building2 className="h-48 w-48 text-white" />
                    </div>
                    <CardContent className="p-8 md:p-12 relative z-10 flex flex-col md:flex-row items-center gap-10">
                        <div className="relative group/logo">
                            <div className="h-40 w-40 rounded-[2.5rem] bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden shadow-inner group-hover/logo:border-primary/50 transition-all">
                                {initialData?.logo_url ? (
                                    <img src={initialData.logo_url} alt="Logo" className="w-full h-full object-contain p-4" />
                                ) : (
                                    <Building2 className="h-16 w-16 text-white/10" />
                                )}
                            </div>
                            <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-slate-950/60 opacity-0 group-hover/logo:opacity-100 transition-opacity rounded-[2.5rem]">
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file && initialData?.id) {
                                            const toastId = toast.loading("Subiendo logo...");
                                            try {
                                                await settingsService.uploadTenantLogo(supabase, initialData.id, file);
                                                toast.success("Logo actualizado", { id: toastId });
                                                window.location.reload();
                                            } catch (error: any) {
                                                toast.error("Error al subir: " + error.message, { id: toastId });
                                            }
                                        }
                                    }}
                                />
                                <div className="text-center">
                                    <Camera className="h-8 w-8 text-white mx-auto mb-2" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Cambiar Logo</span>
                                </div>
                            </label>
                        </div>
                        <div className="flex-1 space-y-4 text-center md:text-left">
                            <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">Identidad Visual</h3>
                            <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.3em] max-w-md">
                                El logo cargado se utilizará automáticamente en todos los reportes PDF, facturas electrónicas y comunicaciones oficiales. Recomendamos fondo transparente (PNG).
                            </p>
                            <div className="flex flex-wrap gap-4 justify-center md:justify-start pt-2">
                                <Badge className="bg-white/5 border-white/10 text-white/40 rounded-full px-4 py-1 text-[8px] font-black uppercase tracking-widest">Máx 2MB</Badge>
                                <Badge className="bg-white/5 border-white/10 text-white/40 rounded-full px-4 py-1 text-[8px] font-black uppercase tracking-widest">PNG / SVG / JPG</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Identidad Legal */}
                <Card className="border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-8 md:p-10 pb-4">
                        <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-3 italic">
                            <Building2 className="h-5 w-5 text-primary" />
                            Identidad Legal
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 md:p-10 pt-0 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Razón Social</Label>
                            <Input
                                {...form.register("name")}
                                placeholder="Nombre de la empresa"
                                className="h-14 bg-slate-50 border-none rounded-2xl font-bold text-base"
                            />
                            {form.formState.errors.name && (
                                <p className="text-[10px] font-bold text-rose-500">{form.formState.errors.name.message}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-3 space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">NIT</Label>
                                <Input
                                    {...form.register("nit")}
                                    placeholder="123456789"
                                    className="h-14 bg-slate-50 border-none rounded-2xl font-bold text-center text-base"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">DV</Label>
                                <Input
                                    {...form.register("dv")}
                                    maxLength={1}
                                    className="h-14 bg-slate-50 border-none rounded-2xl font-black text-primary text-xl text-center"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sitio Web</Label>
                            <div className="relative">
                                <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                                <Input
                                    {...form.register("website")}
                                    placeholder="https://www.empresa.com"
                                    className="h-14 bg-slate-50 border-none rounded-2xl font-bold pl-12 text-sm md:text-base"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Contacto */}
                <Card className="border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-3 italic">
                            <Mail className="h-5 w-5 text-indigo-500" />
                            Contacto
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Correo Corporativo</Label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                <Input
                                    {...form.register("email")}
                                    placeholder="info@empresa.com"
                                    className="h-12 bg-slate-50 border-none rounded-xl font-bold pl-12"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Teléfono</Label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                <Input
                                    {...form.register("phone")}
                                    placeholder="+57 321 ..."
                                    className="h-12 bg-slate-50 border-none rounded-xl font-bold pl-12"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Ubicación */}
                <Card className="border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden md:col-span-2">
                    <CardHeader className="p-8 md:p-10 pb-4">
                        <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-3 italic">
                            <MapPin className="h-5 w-5 text-emerald-500" />
                            Ubicación
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 md:p-10 pt-0">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dirección</Label>
                                <Input
                                    {...form.register("address")}
                                    placeholder="Calle 10 #45-67, Local 203"
                                    className="h-14 bg-slate-50 border-none rounded-2xl font-bold text-base"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ciudad</Label>
                                <Input
                                    {...form.register("city")}
                                    placeholder="Bogotá"
                                    className="h-14 bg-slate-50 border-none rounded-2xl font-bold text-base"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Departamento</Label>
                                <Input
                                    {...form.register("department")}
                                    placeholder="Cundinamarca"
                                    className="h-14 bg-slate-50 border-none rounded-2xl font-bold text-base"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">País</Label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                                    <Input
                                        {...form.register("country")}
                                        placeholder="Colombia"
                                        className="h-14 bg-slate-50 border-none rounded-2xl font-bold pl-12 text-base"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Info Footer */}
            <Card className="border-none bg-indigo-50/50 border border-indigo-100/50 rounded-[2.5rem] p-8 md:p-10">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-200">
                        <Fingerprint className="h-7 w-7" />
                    </div>
                    <div className="space-y-2 text-center md:text-left">
                        <h4 className="font-black text-indigo-900 italic uppercase tracking-tight text-lg">Verificación Electrónica</h4>
                        <p className="text-[11px] md:text-sm font-medium text-indigo-600/80 leading-relaxed">
                            Estos datos son utilizados para la generación de facturación electrónica y nómina electrónica ante la DIAN. Asegúrese de que coincidan con su RUT actualizado para evitar rechazos en el procesamiento.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
