"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/shared/components/ui/card";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { settingsService } from "../services/settingsService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import {
    ChevronRight, ChevronLeft, Save,
    ShieldCheck, Key, Globe, CheckCircle2,
    FileKey, Server, Lock, FileCode
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { DianResolutionsManager } from "./DianResolutionsManager";
import { cn } from "@/shared/lib/utils";

const dianSchema = z.object({
    software_id: z.string().min(5, "Software ID requerido"),
    pin: z.string().min(4, "PIN requerido"),
    technical_key: z.string().min(5, "Llave técnica requerida"),
    environment: z.enum(["TEST", "PROD"]),
    test_set_id_invoice: z.string().optional().or(z.literal("")),
    test_set_id_payroll: z.string().optional().or(z.literal(""))
});

type DianFormValues = z.infer<typeof dianSchema>;

interface Props {
    initialData: any;
    tenantId: string;
}

const STEPS = [
    { id: 1, title: "Credenciales", icon: FileKey, description: "Identificación del software en MUISCA" },
    { id: 2, title: "Ambiente", icon: Server, description: "Definición de entorno de pruebas o producción" },
    { id: 3, title: "Confirmación", icon: CheckCircle2, description: "Revisión y conexión segura" }
];

export function DianSettingsForm({ initialData, tenantId }: Props) {
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const supabase = createClient();

    const form = useForm<DianFormValues>({
        resolver: zodResolver(dianSchema),
        defaultValues: {
            software_id: initialData?.software_id || "",
            pin: initialData?.pin || "",
            technical_key: initialData?.technical_key || "",
            environment: initialData?.environment || "TEST",
            test_set_id_invoice: initialData?.test_set_id_invoice || "",
            test_set_id_payroll: initialData?.test_set_id_payroll || ""
        }
    });

    const nextStep = async () => {
        let fieldsToValidate: any[] = [];
        if (currentStep === 1) fieldsToValidate = ["software_id", "pin", "technical_key"];
        if (currentStep === 2) fieldsToValidate = ["environment"];

        const isValid = await form.trigger(fieldsToValidate);
        if (isValid) setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    };

    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    async function onSubmit(data: DianFormValues) {
        setLoading(true);
        try {
            await settingsService.updateDianConfig(supabase, tenantId, data);
            toast.success("Integración DIAN actualizada correctamente", {
                description: "Los cambios se han aplicado al entorno seleccionado."
            });
        } catch (error: any) {
            toast.error("Error al actualizar: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black tracking-tighter text-slate-900 italic">Asistente de Integración DIAN</h2>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Configuración paso a paso</p>
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
                {/* Stepper Sidebar - Left */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-white">
                        <CardContent className="p-8 space-y-8">
                            {STEPS.map((step, index) => {
                                const isActive = currentStep === step.id;
                                const isCompleted = currentStep > step.id;
                                const Icon = step.icon;

                                return (
                                    <div key={step.id} className={cn("relative flex gap-4", index !== STEPS.length - 1 && "pb-8")}>
                                        {/* Connecting Line */}
                                        {index !== STEPS.length - 1 && (
                                            <div className="absolute left-[19px] top-10 bottom-0 w-[2px] bg-slate-100" />
                                        )}

                                        <div className={cn(
                                            "relative z-10 h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-500",
                                            isActive ? "bg-slate-900 text-white shadow-lg scale-110" :
                                                isCompleted ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                                        )}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="pt-1">
                                            <h4 className={cn("font-bold text-sm", isActive ? "text-slate-900" : "text-slate-500")}>
                                                {step.title}
                                            </h4>
                                            <p className="text-xs text-slate-400 font-medium mt-0.5">{step.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    {/* Resumen status box if configured */}
                    {initialData?.software_id && (
                        <Card className="border-none bg-indigo-600 text-white shadow-premium rounded-[2.5rem] p-8 relative overflow-hidden">
                            <Globe className="absolute -right-6 -bottom-6 h-32 w-32 text-white/10" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
                                    <span className="text-xs font-bold uppercase tracking-widest opacity-80">Estado Actual</span>
                                </div>
                                <h3 className="text-xl font-black italic">Conectado</h3>
                                <p className="text-indigo-200 text-sm mt-1">Ambiente: {initialData.environment}</p>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Wizard Content - Right */}
                <div className="lg:col-span-8">
                    <Card className="border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-white h-full flex flex-col">
                        <CardHeader className="p-10 pb-2">
                            <CardTitle className="text-2xl font-black text-slate-900 italic">
                                {STEPS[currentStep - 1].title}
                            </CardTitle>
                            <CardDescription>
                                Complete la información requerida para avanzar.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="p-10 flex-1">
                            {/* STEP 1: CREDENTIALS */}
                            {currentStep === 1 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Software ID</Label>
                                        <Input
                                            {...form.register("software_id")}
                                            placeholder="Identificador único del software (UUID)"
                                            className="h-14 rounded-2xl bg-slate-50 border-transparent focus:bg-white transition-all font-mono"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">PIN</Label>
                                            <Input
                                                {...form.register("pin")}
                                                type="text"
                                                placeholder="12345"
                                                className="h-14 rounded-2xl bg-slate-50 border-transparent focus:bg-white transition-all font-mono"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Technical Key</Label>
                                            <Input
                                                {...form.register("technical_key")}
                                                placeholder="Clave Hexadecimal..."
                                                className="h-14 rounded-2xl bg-slate-50 border-transparent focus:bg-white transition-all font-mono text-xs"
                                            />
                                        </div>
                                    </div>
                                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 text-amber-700 text-xs">
                                        <Lock className="h-4 w-4 shrink-0" />
                                        <p>Estas credenciales se obtienen en el portal de Habilitación de la DIAN al registrar el software.</p>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: ENVIRONMENT */}
                            {currentStep === 2 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="space-y-4">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Seleccionar Ambiente</Label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div
                                                onClick={() => form.setValue("environment", "TEST")}
                                                className={cn(
                                                    "cursor-pointer p-6 rounded-2xl border-2 transition-all hover:bg-slate-50",
                                                    form.watch("environment") === "TEST" ? "border-slate-900 bg-slate-50" : "border-slate-100"
                                                )}
                                            >
                                                <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center mb-3">
                                                    <FileCode className="h-5 w-5 text-slate-600" />
                                                </div>
                                                <h4 className="font-bold text-slate-900">Habilitación (Test)</h4>
                                                <p className="text-xs text-slate-500 mt-1">Para realizar pruebas de set.</p>
                                            </div>

                                            <div
                                                onClick={() => form.setValue("environment", "PROD")}
                                                className={cn(
                                                    "cursor-pointer p-6 rounded-2xl border-2 transition-all hover:bg-rose-50",
                                                    form.watch("environment") === "PROD" ? "border-rose-500 bg-rose-50" : "border-slate-100"
                                                )}
                                            >
                                                <div className="h-10 w-10 bg-rose-100 rounded-full flex items-center justify-center mb-3">
                                                    <Server className="h-5 w-5 text-rose-600" />
                                                </div>
                                                <h4 className="font-bold text-rose-900">Producción</h4>
                                                <p className="text-xs text-rose-600/70 mt-1">Emisión real de facturas.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {form.watch("environment") === "TEST" && (
                                        <div className="space-y-4 pt-4 border-t border-slate-100">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">TestSet ID (Facturación)</Label>
                                                <Input
                                                    {...form.register("test_set_id_invoice")}
                                                    placeholder="ID del set de pruebas..."
                                                    className="h-14 rounded-2xl bg-slate-50 border-transparent font-mono"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 3: CONFIRM & CERT */}
                            {currentStep === 3 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                                        <h4 className="font-black text-slate-900 text-lg">Resumen de Configuración</h4>
                                        <dl className="grid grid-cols-2 gap-y-4 text-sm">
                                            <div>
                                                <dt className="text-slate-400 font-bold text-xs uppercase">Ambiente</dt>
                                                <dd className="font-bold text-slate-900">{form.watch("environment") === "TEST" ? "Pruebas" : "Producción"}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-slate-400 font-bold text-xs uppercase">Software ID</dt>
                                                <dd className="font-mono text-slate-600 truncate">{form.watch("software_id")}</dd>
                                            </div>
                                        </dl>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Certificado Digital</Label>
                                        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-not-allowed opacity-60">
                                            <ShieldCheck className="h-10 w-10 text-slate-300 mb-3" />
                                            <p className="font-bold text-slate-400">Certificado Digital P12</p>
                                            <p className="text-xs text-slate-300">Gestionado por el sistema automáticamente.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </CardContent>

                        <CardFooter className="p-10 pt-0 flex justify-between">
                            <Button
                                variant="ghost"
                                onClick={prevStep}
                                disabled={currentStep === 1 || loading}
                                className="h-12 px-6 rounded-xl hover:bg-slate-100 text-slate-500"
                            >
                                <ChevronLeft className="h-4 w-4 mr-2" />
                                Anterior
                            </Button>

                            {currentStep < 3 ? (
                                <Button
                                    onClick={nextStep}
                                    className="h-12 px-8 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 shadow-lg"
                                >
                                    Siguiente Paso
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={form.handleSubmit(onSubmit)}
                                    disabled={loading}
                                    className="h-12 px-8 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-emerald-200 shadow-lg"
                                >
                                    {loading ? "Guardando..." : "Confirmar y Guardar"}
                                    <Save className="h-4 w-4 ml-2" />
                                </Button>
                            )}
                        </CardFooter>
                    </Card>

                    <div className="mt-8 flex justify-end">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="h-12 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold">
                                    <Key className="h-4 w-4 mr-2" />
                                    Gestionar Rangos de Numeración
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-5xl h-[80vh] overflow-y-auto p-10 bg-slate-50 border-none rounded-[2.5rem]">
                                <DialogHeader className="mb-6">
                                    <DialogTitle className="text-3xl font-black text-slate-900 italic">Gestión de Numeración DIAN</DialogTitle>
                                    <DialogDescription className="text-slate-500 font-medium">
                                        Configure aquí los rangos de numeración autorizados en su formulario 1876.
                                    </DialogDescription>
                                </DialogHeader>
                                <DianResolutionsManager tenantId={tenantId} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>
            <div className="text-center mt-12 mb-8">
                <p className="text-xs text-slate-300 font-medium">
                    Powered by <span className="text-slate-400 font-bold">GVM Integration Engine™</span>
                </p>
            </div>
        </div>
    );
}
