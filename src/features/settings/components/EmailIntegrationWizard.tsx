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
import {
    ChevronRight, ChevronLeft, Save,
    Mail, ShieldCheck, Key, CheckCircle2,
    LayoutTemplate, Link as LinkIcon, ExternalLink, Globe
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

const emailSchema = z.object({
    tenant_id: z.string().uuid("Tenant ID inválido"),
    client_id: z.string().uuid("Client ID inválido"),
    client_secret: z.string().min(10, "Secret inválido"),
    from_email: z.string().email("Email inválido"),
    from_name: z.string().min(2, "Nombre requerido")
});

type EmailFormValues = z.infer<typeof emailSchema>;

interface Props {
    initialData: any;
    tenantId: string;
}

const STEPS = [
    { id: 1, title: "Registro Azure AD", icon: LayoutTemplate, description: "Crea la aplicación en Microsoft Entra ID" },
    { id: 2, title: "Credenciales", icon: Key, description: "Configura las claves de acceso" },
    { id: 3, title: "Permisos API", icon: ShieldCheck, description: "Autoriza el envío de correos" },
    { id: 4, title: "Confirmación", icon: CheckCircle2, description: "Prueba y guarda la conexión" }
];

export function EmailIntegrationWizard({ initialData, tenantId }: Props) {
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const supabase = createClient();

    const form = useForm<EmailFormValues>({
        resolver: zodResolver(emailSchema),
        defaultValues: {
            tenant_id: initialData?.tenant_id || "",
            client_id: initialData?.client_id || "",
            client_secret: initialData?.client_secret || "",
            from_email: initialData?.from_email || "",
            from_name: initialData?.from_name || ""
        }
    });

    const nextStep = async () => {
        let fieldsToValidate: any[] = [];
        if (currentStep === 2) fieldsToValidate = ["tenant_id", "client_id", "client_secret", "from_email", "from_name"];

        const isValid = await form.trigger(fieldsToValidate);
        if (isValid) setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    };

    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    async function onSubmit(data: EmailFormValues) {
        setLoading(true);
        try {
            // Save config
            const config = {
                provider: 'office365',
                ...data,
                updated_at: new Date().toISOString()
            };

            await settingsService.updateMailConfig(supabase, tenantId, config);

            toast.success("Integración Office 365 guardada", {
                description: "La configuración de correo se ha actualizado correctamente."
            });
        } catch (error: any) {
            toast.error("Error al guardar: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black tracking-tighter text-slate-900 italic">Integración Office 365</h2>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Envío de correos corporativos via Microsoft Graph</p>
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
                {/* Stepper */}
                <div className="lg:col-span-3 space-y-6">
                    <Card className="border-none shadow-premium rounded-[2.5rem] overflow-hidden bg-white">
                        <CardContent className="p-8 space-y-8">
                            {STEPS.map((step, index) => {
                                const isActive = currentStep === step.id;
                                const isCompleted = currentStep > step.id;
                                const Icon = step.icon;

                                return (
                                    <div key={step.id} className={cn("relative flex gap-4", index !== STEPS.length - 1 && "pb-8")}>
                                        {index !== STEPS.length - 1 && (
                                            <div className="absolute left-[19px] top-10 bottom-0 w-[2px] bg-slate-100" />
                                        )}
                                        <div className={cn(
                                            "relative z-10 h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-500",
                                            isActive ? "bg-blue-600 text-white shadow-lg scale-110" :
                                                isCompleted ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                                        )}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="pt-1 hidden lg:block">
                                            <h4 className={cn("font-bold text-sm", isActive ? "text-slate-900" : "text-slate-500")}>
                                                {step.title}
                                            </h4>
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    {/* Status Box */}
                    {initialData?.client_id && (
                        <Card className="border-none bg-blue-600 text-white shadow-premium rounded-[2.5rem] p-8 relative overflow-hidden">
                            <Globe className="absolute -right-6 -bottom-6 h-32 w-32 text-white/10" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
                                    <span className="text-xs font-bold uppercase tracking-widest opacity-80">Estado</span>
                                </div>
                                <h3 className="text-xl font-black italic">Configurado</h3>
                                <p className="text-blue-100 text-sm mt-1 truncate">{initialData.from_email}</p>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Content */}
                <div className="lg:col-span-9">
                    <Card className="border-none shadow-premium rounded-[3rem] overflow-hidden bg-white h-full flex flex-col">
                        <CardHeader className="p-10 pb-2">
                            <CardTitle className="text-2xl font-black text-slate-900 italic">
                                {STEPS[currentStep - 1].title}
                            </CardTitle>
                            <CardDescription className="text-base">
                                {STEPS[currentStep - 1].description}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="p-10 flex-1">
                            {/* STEP 1: AZURE AD REGISTRATION */}
                            {currentStep === 1 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
                                        <h4 className="font-bold text-blue-900 mb-4">1. Registrar Aplicación</h4>
                                        <ol className="list-decimal list-inside space-y-3 text-sm text-blue-800 font-medium">
                                            <li>Accede al <a href="https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps" target="_blank" className="underline font-bold hover:text-blue-600">Azure Portal &gt; App Registrations</a>.</li>
                                            <li>Haz clic en <strong>"New Registration"</strong>.</li>
                                            <li>Asigna un nombre (ej: "GvmCorp Mailer").</li>
                                            <li>En "Supported account types", elige <strong>"Accounts in this organizational directory only"</strong>.</li>
                                            <li>Haz clic en <strong>"Register"</strong>.</li>
                                        </ol>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                        <h4 className="font-bold text-slate-900 mb-4">2. Crear Secreto</h4>
                                        <ol className="list-decimal list-inside space-y-3 text-sm text-slate-600 font-medium">
                                            <li>En el menú de la app, ve a <strong>"Certificates & secrets"</strong>.</li>
                                            <li>Haz clic en <strong>"New client secret"</strong>.</li>
                                            <li>Añade una descripción y expiración (recomendado 24 meses).</li>
                                            <li><strong>¡Importante!</strong> Copia el "Value" del secreto inmediatamente. No podrás verlo después.</li>
                                        </ol>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: CREDENTIALS FORM */}
                            {currentStep === 2 && (
                                <div className="grid gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Directory (Tenant) ID</Label>
                                            <Input {...form.register("tenant_id")} placeholder="uuid-..." className="font-mono bg-slate-50 border-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Application (Client) ID</Label>
                                            <Input {...form.register("client_id")} placeholder="uuid-..." className="font-mono bg-slate-50 border-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Client Secret Value</Label>
                                        <Input {...form.register("client_secret")} type="password" placeholder="Valor del secreto..." className="font-mono bg-slate-50 border-none" />
                                        <p className="text-xs text-slate-400">Pega el valor del secreto, no el ID.</p>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                                        <div className="space-y-2">
                                            <Label>Correo Remitente (From)</Label>
                                            <Input {...form.register("from_email")} placeholder="notificaciones@tuempresa.com" className="bg-slate-50 border-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Nombre Remitente</Label>
                                            <Input {...form.register("from_name")} placeholder="Tu Empresa" className="bg-slate-50 border-none" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: API PERMISSIONS */}
                            {currentStep === 3 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 text-amber-900">
                                        <h4 className="font-bold flex items-center gap-2 mb-4">
                                            <ShieldCheck className="h-5 w-5" /> Configurar Permisos API
                                        </h4>
                                        <p className="text-sm mb-4">
                                            Para enviar correos en nombre de la organización sin interacción de usuario, necesitas permisos de aplicación.
                                        </p>
                                        <ol className="list-decimal list-inside space-y-2 text-sm font-medium">
                                            <li>Ve a <strong>"API Permissions"</strong> &gt; <strong>"Add a permission"</strong>.</li>
                                            <li>Selecciona <strong>"Microsoft Graph"</strong> &gt; <strong>"Application permissions"</strong>.</li>
                                            <li>Busca y selecciona <strong>"Mail.Send"</strong>.</li>
                                            <li>Haz clic en "Add permissions".</li>
                                            <li><strong>CRÍTICO:</strong> Haz clic en el botón <strong>"Grant admin consent for [Org]"</strong>.</li>
                                        </ol>
                                    </div>
                                    <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 text-center">
                                        <p className="text-xs text-slate-400 font-bold uppercase">Estado del Permiso Esperado</p>
                                        <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                                            <CheckCircle2 className="h-3 w-3 mr-1" /> Granted for Organization
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: CONFIRMATION */}
                            {currentStep === 4 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="bg-slate-50 p-8 rounded-[2rem]">
                                        <h4 className="font-black text-slate-900 mb-6">Resumen de Conexión</h4>
                                        <div className="grid md:grid-cols-2 gap-y-4 text-sm">
                                            <div>
                                                <span className="block text-xs font-bold text-slate-400 uppercase">Tenant</span>
                                                <span className="font-mono text-slate-700">{form.watch("tenant_id")}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs font-bold text-slate-400 uppercase">Client ID</span>
                                                <span className="font-mono text-slate-700">{form.watch("client_id")}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs font-bold text-slate-400 uppercase">Remitente</span>
                                                <span className="font-medium text-slate-900">{form.watch("from_name")} &lt;{form.watch("from_email")}&gt;</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-center text-sm text-slate-500">
                                        Al guardar, el sistema intentará autenticarse con Microsoft Graph para validar las credenciales.
                                    </p>
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

                            {currentStep < 4 ? (
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
                                    className="h-12 px-8 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-blue-200 shadow-lg"
                                >
                                    {loading ? "Guardando..." : "Guardar Integración"}
                                    <Save className="h-4 w-4 ml-2" />
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
